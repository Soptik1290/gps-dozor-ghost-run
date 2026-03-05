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
 * Auto-refreshes every 5s for live tracking.
 */
export function useVehicles(groupCode: Ref<string | undefined>) {
    return useQuery({
        queryKey: ['vehicles', groupCode],
        queryFn: async () => {
            // Add cache-busting timestamp
            const cacheBust = Date.now()
            const data = await nestFetch<ApiVehicle[]>(`/vehicles/group/${groupCode.value}?_=${cacheBust}`)
            console.log('[useVehicles] Fetched vehicles:', data?.map(v => ({ code: v.Code, speed: v.Speed, name: v.Name, timestamp: v.LastPositionTimestamp })))
            return data
        },
        enabled: () => !!groupCode.value,
        refetchInterval: 5_000,
        staleTime: 0,
        gcTime: 0,
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
