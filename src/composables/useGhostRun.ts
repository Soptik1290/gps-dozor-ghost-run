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

    // Current "playback" index in the reality trail
    const currentIndex = ref(0)

    // Smoothed time delta in seconds (negative = leading, positive = lagging)
    const timeDelta = ref(0)
    const rawTimeDelta = ref(0)

    // Current position (the "car" on the reality trail)
    const currentPosition = computed(() => {
        if (realityPositions.value.length === 0) return null
        const idx = Math.min(currentIndex.value, realityPositions.value.length - 1)
        return realityPositions.value[idx]
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
    let playbackTimer: ReturnType<typeof setTimeout> | null = null
    const isPlaying = ref(false)
    const playbackSpeed = ref(10) // 1x, 10x, 50x

    // ── Compute delta when currentIndex changes ──
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

        // Find the distance along reality trail at current index
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
        const realityTimeMs = new Date(pos.Time).getTime()

        // Delta = reality_time - ghost_time at same distance
        const rawDelta = (realityTimeMs - ghostTimeMs) / 1000
        rawTimeDelta.value = rawDelta
        timeDelta.value = Math.round(smoother.push(rawDelta))
    }

    // ── Compute Synchronized Ghost Position ──
    // Finds the physical coordinate of the ghost at the exact same elapsed time as reality
    const currentGhostPosition = computed(() => {
        if (realityPositions.value.length === 0 || ghostPositions.value.length === 0) return null

        const realityStartMs = new Date(realityPositions.value[0].Time).getTime()
        const currentRealityMs = new Date(realityPositions.value[currentIndex.value].Time).getTime()
        const elapsedMs = currentRealityMs - realityStartMs

        const ghostStartMs = new Date(ghostPositions.value[0].Time).getTime()
        const targetGhostMs = ghostStartMs + elapsedMs

        // Find which two ghost points surround this target time
        const gp = ghostPositions.value
        let fracIdx = gp.length - 1

        for (let i = 0; i < gp.length - 1; i++) {
            const t1 = new Date(gp[i].Time).getTime()
            const t2 = new Date(gp[i + 1].Time).getTime()
            if (targetGhostMs >= t1 && targetGhostMs <= t2) {
                const frac = (t2 - t1) === 0 ? 0 : (targetGhostMs - t1) / (t2 - t1)
                fracIdx = i + frac
                break
            } else if (targetGhostMs < t1 && i === 0) {
                fracIdx = 0
                break
            }
        }

        const i = Math.floor(fracIdx)
        const frac = fracIdx - i
        if (i >= gp.length - 1) return gp[gp.length - 1]

        const lat1 = parseFloat(gp[i].Lat), lng1 = parseFloat(gp[i].Lng)
        const lat2 = parseFloat(gp[i + 1].Lat), lng2 = parseFloat(gp[i + 1].Lng)

        return {
            ...gp[i],
            Lat: (lat1 + frac * (lat2 - lat1)).toFixed(6),
            Lng: (lng1 + frac * (lng2 - lng1)).toFixed(6)
        }
    })

    // ── Simulate playback (advance through reality positions over time) ──
    function playbackLoop() {
        if (!isPlaying.value) return

        if (currentIndex.value < realityPositions.value.length - 1) {
            const currentMs = new Date(realityPositions.value[currentIndex.value].Time).getTime()
            const nextMs = new Date(realityPositions.value[currentIndex.value + 1].Time).getTime()

            // Time to wait before moving to next point (scaled by playbackSpeed)
            let delayMs = Math.max(16, (nextMs - currentMs) / playbackSpeed.value)
            // Clamp huge gaps
            if (delayMs > 2000) delayMs = 2000

            playbackTimer = setTimeout(() => {
                currentIndex.value++
                computeDelta()
                playbackLoop()
            }, delayMs)
        } else {
            stopPlayback()
            triggerRaceEngineer() // Final trigger
        }
    }

    function startPlayback() {
        stopPlayback()
        isPlaying.value = true
        if (currentIndex.value >= realityPositions.value.length - 1) {
            currentIndex.value = 0
            smoother.reset()
        }
        computeDelta()
        playbackLoop()
    }

    function stopPlayback() {
        isPlaying.value = false
        if (playbackTimer) {
            clearTimeout(playbackTimer)
            playbackTimer = null
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
            currentIndex.value = realityPositions.value.length - 1
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
