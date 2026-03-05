import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { nestFetch } from '@/api/client'

/**
 * Formats a Date to the "YYYY-MM-DDTHH:mm" string the API expects.
 */
function formatDateParam(d: Date): string {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}T00:00`
}

/**
 * Fetch trips for a specific vehicle and date.
 */
export function useTrips(
    vehicleCode: Ref<string | undefined>,
    selectedDate: Ref<Date>
) {
    const from = computed(() => formatDateParam(selectedDate.value))
    const to = computed(() => {
        const next = new Date(selectedDate.value)
        next.setDate(next.getDate() + 1)
        return formatDateParam(next)
    })

    return useQuery({
        queryKey: ['trips', vehicleCode, from, to],
        queryFn: () =>
            nestFetch<any[]>(
                `/trips?vehicleCode=${encodeURIComponent(vehicleCode.value!)}&from=${encodeURIComponent(from.value)}&to=${encodeURIComponent(to.value)}`
            ),
        enabled: () => !!vehicleCode.value && vehicleCode.value !== '_',
    })
}

/**
 * Match a historical Ghost trip to a live navigation route.
 */
export async function matchGhostTrip(
    currentLat: number,
    currentLng: number,
    destinationLat: number,
    destinationLng: number
) {
    return nestFetch('/trips/match', {
        method: 'POST',
        body: JSON.stringify({ currentLat, currentLng, destinationLat, destinationLng }),
    })
}

/**
 * Fetch Context-Aware AI Tactical Feedback for Driver
 */
export async function analyzeDriver(tripId: number | string) {
    return nestFetch(`/trips/${tripId}/analyze/driver`, { method: 'POST' })
}

/**
 * Fetch Context-Aware AI Financial Feedback for Admin
 */
export async function analyzeAdmin(tripId: number | string) {
    return nestFetch(`/trips/${tripId}/analyze/admin`, { method: 'POST' })
}

/**
 * Fetch Post-Mission Evaluation Report
 */
export async function getTripEvaluation(tripId: number | string) {
    return nestFetch<any>(`/trips/${tripId}/evaluation`)
}

