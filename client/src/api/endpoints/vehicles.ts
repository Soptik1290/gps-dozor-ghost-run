import { useQuery } from '@tanstack/vue-query'
import { type Ref } from 'vue'
import { nestFetch } from '@/api/client'
import type { ApiVehicle, ApiGroup } from '@/api/types'

/**
 * Fetch available groups for the authenticated user.
 */
export function useGroups() {
    return useQuery({
        queryKey: ['groups'],
        queryFn: () => nestFetch<ApiGroup[]>('/vehicles/groups'),
        staleTime: 60_000,
    })
}

/**
 * Fetch all vehicles in a given group.
 * Auto-refreshes every 15s for live tracking.
 */
export function useVehicles(groupCode: Ref<string | undefined>) {
    return useQuery({
        queryKey: ['vehicles', groupCode],
        queryFn: () => nestFetch<ApiVehicle[]>(`/vehicles/group/${groupCode.value}`),
        enabled: () => !!groupCode.value,
        refetchInterval: 15_000,
    })
}

/**
 * Fetch a single vehicle's current info.
 */
export function useVehicle(vehicleCode: Ref<string | undefined>) {
    return useQuery({
        queryKey: ['vehicle', vehicleCode],
        queryFn: () => nestFetch<ApiVehicle>(`/vehicles/code/${vehicleCode.value}`),
        enabled: () => !!vehicleCode.value && vehicleCode.value !== '_',
        refetchInterval: 10_000,
    })
}
