import { useQuery } from '@tanstack/vue-query'
import { type Ref } from 'vue'
import { nestFetch } from '@/api/client'
import type { ApiVehicleHistory } from '@/api/types'

/**
 * Fetch position history for a vehicle in a time range.
 * Used for rendering ghost/reality trails on the map.
 */
export function useVehicleHistory(
    vehicleCode: Ref<string | undefined>,
    from: Ref<string | undefined>,
    to: Ref<string | undefined>
) {
    return useQuery({
        queryKey: ['history', vehicleCode, from, to],
        queryFn: () =>
            nestFetch<ApiVehicleHistory>(
                `/trips/history?vehicleCode=${encodeURIComponent(vehicleCode.value!)}&from=${encodeURIComponent(from.value!)}&to=${encodeURIComponent(to.value!)}`
            ),
        enabled: () =>
            !!vehicleCode.value &&
            vehicleCode.value !== '_' &&
            !!from.value &&
            !!to.value,
    })
}
