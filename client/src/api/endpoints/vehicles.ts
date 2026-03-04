import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { apiFetch } from '@/api/client'
import type { ApiVehicle, ApiGroup } from '@/api/types'

/**
 * Fetch available groups for the authenticated user.
 */
export function useGroups() {
    return useQuery({
        queryKey: ['groups'],
        queryFn: () => apiFetch<ApiGroup[]>('/groups'),
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
        queryFn: () => apiFetch<ApiVehicle[]>(`/vehicles/group/${groupCode.value}`),
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
        queryFn: () => apiFetch<ApiVehicle>(`/vehicle/${vehicleCode.value}`),
        enabled: () => !!vehicleCode.value && vehicleCode.value !== '_',
        refetchInterval: 10_000,
    })
}
