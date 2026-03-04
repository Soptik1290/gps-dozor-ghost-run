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
// Find Nearest Point on Ghost Trail
// Returns the index of the nearest ghost position to a given point
// ═══════════════════════════════════════
function findNearestIndex(
    lat: number, lng: number,
    positions: ApiHistoryEntry[]
): { index: number; distance: number } {
    let minDist = Infinity
    let minIndex = 0

    for (let i = 0; i < positions.length; i++) {
        const d = haversineMeters(
            lat, lng,
            parseFloat(positions[i].Lat),
            parseFloat(positions[i].Lng)
        )
        if (d < minDist) {
            minDist = d
            minIndex = i
        }
    }

    return { index: minIndex, distance: minDist }
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
                // Interpolate between i-1 and i
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

        // Get timestamp of reality at current index
        const realityTimeMs = new Date(pos.Time).getTime()

        // Delta = reality_time - ghost_time at same distance
        // Positive = reality took more time (lagging), negative = leading
        const rawDelta = (realityTimeMs - ghostTimeMs) / 1000
        rawTimeDelta.value = rawDelta
        timeDelta.value = Math.round(smoother.push(rawDelta))
    }

    // ── Simulate playback (advance through reality positions over time) ──
    let playbackInterval: ReturnType<typeof setInterval> | null = null

    function startPlayback() {
        stopPlayback()
        smoother.reset()
        currentIndex.value = 0

        if (realityPositions.value.length < 2) return

        // Calculate total trip time
        const firstTime = new Date(realityPositions.value[0].Time).getTime()
        const lastTime = new Date(
            realityPositions.value[realityPositions.value.length - 1].Time
        ).getTime()
        const totalMs = lastTime - firstTime

        // Step through positions at an accelerated rate (30x speed)
        const stepMs = Math.max(50, totalMs / realityPositions.value.length / 30)

        playbackInterval = setInterval(() => {
            if (currentIndex.value < realityPositions.value.length - 1) {
                currentIndex.value++
                computeDelta()
            } else {
                stopPlayback()
                // Final trigger when trip completes
                triggerRaceEngineer()
            }
        }, stepMs)
    }

    function stopPlayback() {
        if (playbackInterval) {
            clearInterval(playbackInterval)
            playbackInterval = null
        }
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
            if (rp.length > 1 && gp.length > 1) {
                startPlayback()
                // Initial setup trigger
                setTimeout(triggerRaceEngineer, 2000)
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
        currentSpeed,
        timeDelta,
        rawTimeDelta,
        progressPercent,
        totalRouteLength,
        isThinking,
        activeMessage,
        triggerRaceEngineer,
        startPlayback,
        stopPlayback,
        skipToEnd,
        computeDelta,
    }
}
