import { computed, ref, watch, type Ref } from 'vue'
import type { ApiHistoryEntry, WeatherData, ApiEcoDrivingEvent } from '@/api/types'
import { useRaceEngineer, type RaceMessage } from '@/composables/useRaceEngineer'

// ═══════════════════════════════════════
// Haversine — distance between two GPS points in meters
// ═══════════════════════════════════════
function haversineMeters(
    lat1: number, lng1: number,
    lat2: number, lng2: number
): number {
    const R = 6371000 // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ═══════════════════════════════════════
// Cumulative Distance along a trail (in meters)
// Used for "how far along the route" comparison
// ═══════════════════════════════════════
function buildCumulativeDistances(positions: ApiHistoryEntry[]): number[] {
    const dists: number[] = [0]
    for (let i = 1; i < positions.length; i++) {
        const d = haversineMeters(
            parseFloat(positions[i - 1].Lat), parseFloat(positions[i - 1].Lng),
            parseFloat(positions[i].Lat), parseFloat(positions[i].Lng)
        )
        dists.push(dists[i - 1] + d)
    }
    return dists
}

// ═══════════════════════════════════════
// Interpolate timestamp at a fractional index
// ═══════════════════════════════════════
function interpolateTime(positions: ApiHistoryEntry[], fracIndex: number): number {
    const i = Math.floor(fracIndex)
    const frac = fracIndex - i

    if (i >= positions.length - 1) {
        return new Date(positions[positions.length - 1].Time).getTime()
    }

    const t1 = new Date(positions[i].Time).getTime()
    const t2 = new Date(positions[i + 1].Time).getTime()
    return t1 + frac * (t2 - t1)
}

// ═══════════════════════════════════════
// Interpolate position by exact timestamp
// ═══════════════════════════════════════
function interpolatePositionByTime(positions: ApiHistoryEntry[], targetTimeMs: number): ApiHistoryEntry | null {
    if (positions.length === 0) return null

    let idx1 = 0
    let idx2 = 0

    for (let i = 0; i < positions.length - 1; i++) {
        const t1 = new Date(positions[i].Time).getTime()
        const t2 = new Date(positions[i + 1].Time).getTime()
        if (targetTimeMs >= t1 && targetTimeMs <= t2) {
            idx1 = i
            idx2 = i + 1
            break
        } else if (targetTimeMs < t1 && i === 0) {
            return positions[0]
        }
    }

    if (idx1 === idx2) return positions[positions.length - 1]

    const t1 = new Date(positions[idx1].Time).getTime()
    const t2 = new Date(positions[idx2].Time).getTime()
    const frac = (t2 - t1) === 0 ? 0 : (targetTimeMs - t1) / (t2 - t1)

    const lat1 = parseFloat(positions[idx1].Lat)
    const lng1 = parseFloat(positions[idx1].Lng)
    const lat2 = parseFloat(positions[idx2].Lat)
    const lng2 = parseFloat(positions[idx2].Lng)

    return {
        ...positions[idx1],
        Lat: (lat1 + frac * (lat2 - lat1)).toFixed(6),
        Lng: (lng1 + frac * (lng2 - lng1)).toFixed(6)
    }
}

// ═══════════════════════════════════════
// Rolling Average Smoother
// Prevents delta from flickering
// ═══════════════════════════════════════
class RollingAverage {
    private buffer: number[] = []
    private size: number

    constructor(windowSize: number = 5) {
        this.size = windowSize
    }

    push(value: number): number {
        this.buffer.push(value)
        if (this.buffer.length > this.size) {
            this.buffer.shift()
        }
        return this.buffer.reduce((a, b) => a + b, 0) / this.buffer.length
    }

    reset() {
        this.buffer = []
    }
}

// ═══════════════════════════════════════
// Main Composable: useGhostRun
// ═══════════════════════════════════════
export function useGhostRun(
    realityPositions: Ref<ApiHistoryEntry[]>,
    ghostPositions: Ref<ApiHistoryEntry[]>,
    weather: Ref<WeatherData | null | undefined>,
    ecoEvents: Ref<ApiEcoDrivingEvent[]>
) {
    const smoother = new RollingAverage(5)

    // Current "playback" time in MS from the start of the trip
    const currentPlaybackTimeMs = ref(0)
    let lastFrameTime = 0
    let rafId: number | null = null

    // Compute the index corresponding to currentPlaybackTimeMs
    const currentIndex = computed(() => {
        if (realityPositions.value.length === 0) return 0
        const startMs = new Date(realityPositions.value[0].Time).getTime()
        const targetMs = startMs + currentPlaybackTimeMs.value

        let idx = 0
        for (let i = 0; i < realityPositions.value.length; i++) {
            if (new Date(realityPositions.value[i].Time).getTime() <= targetMs) {
                idx = i
            } else {
                break
            }
        }
        return idx
    })

    // Smoothed time delta in seconds (negative = leading, positive = lagging)
    const timeDelta = ref(0)
    const rawTimeDelta = ref(0)

    // Current position (smoothly interpolated "car" on the reality trail)
    const currentPosition = computed(() => {
        if (realityPositions.value.length === 0) return null
        const startMs = new Date(realityPositions.value[0].Time).getTime()
        return interpolatePositionByTime(realityPositions.value, startMs + currentPlaybackTimeMs.value)
    })

    // Current speed from reality trail
    const currentSpeed = computed(() => currentPosition.value?.Speed ?? 0)

    // Ghost cumulative distances (precomputed)
    const ghostDistances = computed(() =>
        ghostPositions.value.length > 1
            ? buildCumulativeDistances(ghostPositions.value)
            : []
    )

    // Reality cumulative distances
    const realityDistances = computed(() =>
        realityPositions.value.length > 1
            ? buildCumulativeDistances(realityPositions.value)
            : []
    )

    // Total route length
    const totalRouteLength = computed(() => {
        const d = realityDistances.value
        return d.length > 0 ? d[d.length - 1] : 0
    })

    // Progress as percentage (0-100)
    const progressPercent = computed(() => {
        if (totalRouteLength.value === 0) return 0
        const d = realityDistances.value
        const currentDist = d[Math.min(currentIndex.value, d.length - 1)] ?? 0
        return Math.min(100, (currentDist / totalRouteLength.value) * 100)
    })

    // ── Gamification Engine (Race Engineer) ──
    const { isThinking, requestAdvice, speak } = useRaceEngineer()
    const activeMessage = ref<RaceMessage | null>(null)

    // Request AI Advice with current context
    async function triggerRaceEngineer() {
        try {
            const msg = await requestAdvice({
                speed: currentSpeed.value,
                delta: timeDelta.value,
                weather: weather.value,
                ecoEvents: ecoEvents.value
            })
            activeMessage.value = msg
            speak(msg.text)

            // Clear message after 8 seconds
            setTimeout(() => {
                if (activeMessage.value?.text === msg.text) {
                    activeMessage.value = null
                }
            }, 8000)
        } catch (err) {
            if ((err as Error).message !== 'Cooldown active') {
                // Silently ignore cooldown skips
            }
        }
    }

    // ── Auto-Triggers for Race Engineer ──
    // 1. Trigger when Delta crosses +/- 10s threshold
    watch(timeDelta, (newDelta, oldDelta) => {
        if (Math.abs(newDelta) >= 10 && Math.abs(oldDelta) < 10) {
            triggerRaceEngineer()
        }
        // Also trigger if it was way off and now matching
        if (Math.abs(oldDelta) >= 15 && Math.abs(newDelta) <= 2) {
            triggerRaceEngineer()
        }
    })

    // 2. Trigger on Weather warnings (if speed is high)
    watch([weather, currentSpeed], ([w, speed]) => {
        if (w && w.trackStatus !== 'DRY' && speed > 70 && !isThinking.value) {
            triggerRaceEngineer()
        }
    })

    // 3. Trigger on new Eco Event (simulated by checking array length in playback if animated)
    const previousEcoCount = ref(0)
    watch(() => ecoEvents.value.length, (newLen) => {
        if (newLen > previousEcoCount.value && newLen >= 3) {
            triggerRaceEngineer()
        }
        previousEcoCount.value = newLen
    })

    // ── Simulation State ──
    const isPlaying = ref(false)
    const playbackSpeed = ref(10) // 1x, 10x, 50x

    // ── Compute delta when currentPlaybackTimeMs changes ──
    function computeDelta() {
        if (
            ghostPositions.value.length < 2 ||
            realityPositions.value.length < 2 ||
            ghostDistances.value.length === 0 ||
            realityDistances.value.length === 0
        ) {
            timeDelta.value = 0
            rawTimeDelta.value = 0
            return
        }

        const pos = currentPosition.value
        if (!pos) return

        // Find the distance along reality trail at current interpolated index
        const realityDist = realityDistances.value[
            Math.min(currentIndex.value, realityDistances.value.length - 1)
        ]

        // Find the equivalent point on ghost trail by distance
        const gd = ghostDistances.value
        let ghostFracIdx = 0
        for (let i = 1; i < gd.length; i++) {
            if (gd[i] >= realityDist) {
                const segLen = gd[i] - gd[i - 1]
                const frac = segLen > 0 ? (realityDist - gd[i - 1]) / segLen : 0
                ghostFracIdx = i - 1 + frac
                break
            }
            if (i === gd.length - 1) {
                ghostFracIdx = gd.length - 1
            }
        }

        // Get timestamp of ghost at that point
        const ghostTimeMs = interpolateTime(ghostPositions.value, ghostFracIdx)

        // Exact reality timestamp interpolated
        const realityStartMs = new Date(realityPositions.value[0].Time).getTime()
        const realityTimeMs = realityStartMs + currentPlaybackTimeMs.value

        // Delta = reality_time - ghost_time at same distance
        const rawDelta = (realityTimeMs - ghostTimeMs) / 1000
        rawTimeDelta.value = rawDelta
        timeDelta.value = Math.round(smoother.push(rawDelta))
    }

    // React to playback time changes to compute delta often
    watch(currentPlaybackTimeMs, () => {
        if (isPlaying.value) {
            computeDelta()
        }
    })

    // ── Compute Synchronized Ghost Position ──
    const currentGhostPosition = computed(() => {
        if (realityPositions.value.length === 0 || ghostPositions.value.length === 0) return null
        const ghostStartMs = new Date(ghostPositions.value[0].Time).getTime()
        return interpolatePositionByTime(ghostPositions.value, ghostStartMs + currentPlaybackTimeMs.value)
    })

    // ── Simulate playback (advance through reality positions smoothly) ──
    function playbackLoop(timestamp: number) {
        if (!isPlaying.value) return

        if (!lastFrameTime) lastFrameTime = timestamp
        const deltaMs = timestamp - lastFrameTime
        lastFrameTime = timestamp

        // Cap HUGE delta frames (e.g. tab goes to background)
        const frameStepMs = Math.min(deltaMs, 100) * playbackSpeed.value
        currentPlaybackTimeMs.value += frameStepMs

        const firstTime = new Date(realityPositions.value[0].Time).getTime()
        const lastTime = new Date(realityPositions.value[realityPositions.value.length - 1].Time).getTime()
        const totalDurationMs = lastTime - firstTime

        if (currentPlaybackTimeMs.value >= totalDurationMs) {
            currentPlaybackTimeMs.value = totalDurationMs
            computeDelta()
            stopPlayback()
            triggerRaceEngineer() // Final trigger
        } else {
            rafId = requestAnimationFrame(playbackLoop)
        }
    }

    function startPlayback() {
        stopPlayback()
        isPlaying.value = true

        if (realityPositions.value.length < 2) return
        const firstTime = new Date(realityPositions.value[0].Time).getTime()
        const lastTime = new Date(realityPositions.value[realityPositions.value.length - 1].Time).getTime()
        const totalDurationMs = lastTime - firstTime

        if (currentPlaybackTimeMs.value >= totalDurationMs) {
            currentPlaybackTimeMs.value = 0
            smoother.reset()
        }

        lastFrameTime = 0
        rafId = requestAnimationFrame(playbackLoop)
    }

    function stopPlayback() {
        isPlaying.value = false
        if (rafId) {
            cancelAnimationFrame(rafId)
            rafId = null
        }
    }

    function togglePlayback() {
        if (isPlaying.value) stopPlayback()
        else startPlayback()
    }

    // Skip to end (show final results)
    function skipToEnd() {
        stopPlayback()
        if (realityPositions.value.length > 0) {
            const firstTime = new Date(realityPositions.value[0].Time).getTime()
            const lastTime = new Date(realityPositions.value[realityPositions.value.length - 1].Time).getTime()
            currentPlaybackTimeMs.value = lastTime - firstTime
            computeDelta()
            triggerRaceEngineer()
        }
    }

    // Auto-start playback when ghost + reality data both arrive
    watch(
        [realityPositions, ghostPositions],
        ([rp, gp]) => {
            if (rp.length > 1 && gp.length > 1 && !isPlaying.value && currentIndex.value === 0) {
                playbackSpeed.value = 10 // Default to 10x for initial auto-run
                startPlayback()
                setTimeout(triggerRaceEngineer, 2000) // Initial setup trigger
            }
        },
        { immediate: true }
    )

    // If only reality (no ghost), jump to end
    watch(
        realityPositions,
        (rp) => {
            if (rp.length > 1 && ghostPositions.value.length < 2) {
                skipToEnd()
            }
        },
        { immediate: true }
    )

    return {
        currentIndex,
        currentPosition,
        currentGhostPosition,
        currentSpeed,
        timeDelta,
        rawTimeDelta,
        progressPercent,
        totalRouteLength,
        isThinking,
        activeMessage,
        isPlaying,
        playbackSpeed,
        triggerRaceEngineer,
        startPlayback,
        stopPlayback,
        togglePlayback,
        skipToEnd,
        computeDelta,
    }
}
