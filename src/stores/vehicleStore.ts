import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Vehicle, ApiGroup } from '@/api/types'

export const useVehicleStore = defineStore('vehicles', () => {
    const vehicles = ref<Vehicle[]>([])
    const activeVehicleCode = ref<string | null>(null)
    const groups = ref<ApiGroup[]>([])
    const activeGroupCode = ref<string | null>(null)

    // Crew filter: IDs of vehicles marked as "My Crew"
    const crewVehicleCodes = ref<Set<string>>(
        new Set([
            // Mocking a few vehicles to always be in the crew for demo purposes
            'JOZIMUBORU', // BMW 740i
            'EFELUPANUV', // Peugeot 508
            'BACOGIREMI', // Škoda
        ])
    )

    function setVehicles(list: Vehicle[]) {
        vehicles.value = list.map((v) => ({
            ...v,
            isTeammate: crewVehicleCodes.value.has(v.Code),
            isMoving: v.Speed > 0,
            lastSeenAgo: Math.floor(
                (Date.now() - new Date(v.LastPositionTimestamp).getTime()) / 1000
            ),
        }))
    }

    function setActiveVehicle(code: string) {
        activeVehicleCode.value = code
    }

    function toggleCrewMember(vehicleCode: string) {
        if (crewVehicleCodes.value.has(vehicleCode)) {
            crewVehicleCodes.value.delete(vehicleCode)
        } else {
            crewVehicleCodes.value.add(vehicleCode)
        }
        localStorage.setItem(
            'ghost_run_crew',
            JSON.stringify([...crewVehicleCodes.value])
        )
        // Re-apply crew flag
        vehicles.value = vehicles.value.map((v) => ({
            ...v,
            isTeammate: crewVehicleCodes.value.has(v.Code),
        }))
    }

    return {
        vehicles,
        activeVehicleCode,
        groups,
        activeGroupCode,
        crewVehicleCodes,
        setVehicles,
        setActiveVehicle,
        toggleCrewMember,
    }
})
