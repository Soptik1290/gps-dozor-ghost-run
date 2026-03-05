import { useQuery } from '@tanstack/vue-query'
import { type Ref } from 'vue'
import { nestFetch } from '@/api/client'
import type { ApiEcoDrivingEvent } from '@/api/types'

/**
 * Fetch eco-driving events (hard braking, cornering, etc.) for a vehicle in a time range.
 * Renders as map markers on the ghost run trail.
 */
export function useEcoDrivingEvents(
    vehicleCode: Ref<string | undefined>,
    from: Ref<string | undefined>,
    to: Ref<string | undefined>
) {
    return useQuery({
        queryKey: ['eco-events', vehicleCode, from, to],
        queryFn: () =>
            nestFetch<ApiEcoDrivingEvent[]>(
                `/trips/eco-events?vehicleCode=${encodeURIComponent(vehicleCode.value!)}&from=${encodeURIComponent(from.value!)}&to=${encodeURIComponent(to.value!)}`
            ),
        enabled: () =>
            !!vehicleCode.value &&
            vehicleCode.value !== '_' &&
            !!from.value &&
            !!to.value,
    })
}
