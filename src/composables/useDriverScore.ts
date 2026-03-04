import { computed, type Ref } from 'vue'
import type { ApiEcoDrivingEvent } from '@/api/types'

export function useDriverScore(
    timeDeltaSeconds: Ref<number>,
    ecoEvents: Ref<ApiEcoDrivingEvent[]>
) {
    const ecoIncidentCount = computed(() => ecoEvents.value.length)

    // Penalty points
    const ecoPenalty = computed(() => ecoIncidentCount.value * 5)

    // Time penalty: -1 point every 30s lagging (delta positive means lagging)
    const timePenalty = computed(() => {
        if (timeDeltaSeconds.value <= 0) return 0 // Leading or exact time = 0 penalty
        return Math.floor(timeDeltaSeconds.value / 30) // 1 pt per 30 seconds
    })

    const score = computed(() => {
        const rawScore = 100 - ecoPenalty.value - timePenalty.value
        return Math.max(0, Math.min(100, rawScore)) // Clamp between 0 and 100
    })

    const tier = computed(() => {
        const s = score.value
        if (s >= 95) return 'S'
        if (s >= 80) return 'A'
        if (s >= 60) return 'B'
        if (s >= 40) return 'C'
        return 'F'
    })

    const tierLabel = computed(() => {
        const t = tier.value
        if (t === 'S') return 'LEGEND'
        if (t === 'A') return 'ELITE'
        if (t === 'B') return 'STANDARD'
        if (t === 'C') return 'ROOKIE'
        return 'HAZARD'
    })

    const aiComment = computed(() => {
        // Deterministic AI comments based on status
        if (tier.value === 'S') {
            return "FLAWLESS EXECUTION. PACING AND EFFICIENCY AT THEORETICAL MAXIMUM."
        }
        if (tier.value === 'A') {
            if (ecoIncidentCount.value > 0) return "PACING OPTIMAL. CORNERING AND BRAKING NEED MINOR REFINEMENT."
            return "EXCELLENT EFFICIENCY. MARGINAL TIME LOSS DETECTED."
        }
        if (ecoIncidentCount.value > 3 && timeDeltaSeconds.value > 120) {
            return "ERRATIC DRIVING DETECTED. HIGH TIME LOSS. RE-TRAINING MANDATORY."
        }
        if (ecoIncidentCount.value > 3) {
            return "SECTOR INSTABILITY DETECTED. AGGRESSIVE MANEUVERS TRIGGERED PENALTIES."
        }
        if (timeDeltaSeconds.value > 180) {
            return "GHOST DOMINATED. PERFORMANCE BELOW EXPECTATION. PACE TOO SLOW."
        }
        if (tier.value === 'F') {
            return "CRITICAL FAILURE IN BOTH EFFICIENCY AND PACING. MISSION ABORTED."
        }
        return "ACCEPTABLE PARAMETERS. ROOM FOR OPTIMIZATION IN ALL SECTORS."
    })

    return {
        score,
        tier,
        tierLabel,
        timeLossSeconds: computed(() => Math.max(0, timeDeltaSeconds.value)),
        ecoIncidentCount,
        aiComment
    }
}
