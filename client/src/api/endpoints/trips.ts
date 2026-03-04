import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { apiFetch } from '@/api/client'
import type { ApiTrip } from '@/api/types'

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
            apiFetch<ApiTrip[]>(
                `/vehicle/${vehicleCode.value}/trips?from=${from.value}&to=${to.value}`
            ),
        enabled: () => !!vehicleCode.value && vehicleCode.value !== '_',
    })
}
