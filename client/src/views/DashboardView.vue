<template>
  <div class="dashboard-view min-h-dvh pb-20 bg-void">
    <!-- ── Top Header ── -->
    <header class="glass-panel border-b border-panel-border px-4 py-3 flex items-center justify-between">
      <div>
        <div class="text-muted text-[0.5625rem] uppercase tracking-[0.2em] font-mono">
          FLEET MONITOR
        </div>
        <h1 class="heading text-lg text-primary">
          {{ activeGroup?.Name || 'SCANNING...' }}
        </h1>
        <div class="text-muted text-xs font-mono mt-1">
          Select a vehicle to view telemetry
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span
          class="inline-block w-2 h-2 bg-volt animate-glow-pulse"
          title="Live connection"
        />
        <span class="text-muted text-[0.625rem] font-mono">LIVE</span>
      </div>
    </header>

    <!-- ── Crew / Fleet Toggle ── -->
    <div class="flex border-b border-panel-border">
      <button
        @click="ui.activeTab = 'crew'"
        class="flex-1 py-3 text-center text-[0.6875rem] uppercase tracking-wider font-mono
               transition-colors border-b-2"
        :class="ui.activeTab === 'crew'
          ? 'text-volt border-volt'
          : 'text-muted border-transparent hover:text-primary'"
      >
        MY CREW
      </button>
      <button
        @click="ui.activeTab = 'fleet'"
        class="flex-1 py-3 text-center text-[0.6875rem] uppercase tracking-wider font-mono
               transition-colors border-b-2"
        :class="ui.activeTab === 'fleet'
          ? 'text-volt border-volt'
          : 'text-muted border-transparent hover:text-primary'"
      >
        ALL FLEET
      </button>
    </div>

    <!-- ── Loading State ── -->
    <div v-if="vehiclesLoading" class="flex items-center justify-center py-20">
      <div class="text-volt text-sm font-mono animate-pulse-neon">
        SCANNING VEHICLES...
      </div>
    </div>

    <!-- ── Error State ── -->
    <div v-else-if="vehiclesError" class="px-4 py-8 text-center">
      <div class="text-danger text-sm font-mono mb-2">SIGNAL LOST</div>
      <div class="text-muted text-xs font-mono">{{ (vehiclesError as Error).message }}</div>
      <button @click="() => vehiclesRefetch()" class="btn btn--ghost mt-4 text-xs">RETRY</button>
    </div>

    <!-- ── Vehicle List ── -->
    <div v-else class="scroll-fade overflow-y-auto" style="max-height: calc(100dvh - 180px);">
      <div
        v-for="vehicle in filteredVehicles"
        :key="vehicle.Code"
        class="vehicle-card glass-panel glass-panel--hover border-b border-panel-border
               px-4 py-3 cursor-pointer active:bg-panel-hover transition-all duration-150"
        @click="openVehicle(vehicle)"
      >
        <div class="flex items-center gap-3">
          <!-- Status dot -->
          <div class="flex-shrink-0">
            <div
              class="w-2.5 h-2.5"
              :class="vehicle.Speed > 0
                ? 'bg-volt animate-glow-pulse'
                : 'bg-dim'"
            />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="heading text-sm text-primary truncate">{{ vehicle.Name }}</span>
              <span
                v-if="vehicleStore.crewVehicleCodes.has(vehicle.Code)"
                class="text-[0.5rem] text-volt font-mono tracking-wider bg-volt-dim px-1.5 py-0.5"
              >
                CREW
              </span>
            </div>
            <div class="text-muted text-[0.625rem] font-mono mt-0.5">
              {{ vehicle.SPZ || 'NO PLATE' }}
            </div>
          </div>

          <!-- Speed -->
          <div class="data-label text-right flex-shrink-0">
            <span class="data-label__key">SPD</span>
            <span
              class="data-label__value text-sm"
              :class="vehicle.Speed > 0 ? 'text-volt' : 'text-dim'"
            >
              {{ vehicle.Speed }} <span class="text-[0.5rem] text-muted">km/h</span>
            </span>
          </div>

          <!-- Chevron -->
          <ChevronRight :size="16" class="text-dim flex-shrink-0" />
        </div>

        <!-- ── Extended Info Row ── -->
        <div class="flex items-center gap-4 mt-2 ml-5 text-[0.625rem] font-mono">
          <div v-if="vehicle.BatteryPercentage > 0" class="data-label">
            <span class="data-label__key">BAT</span>
            <span class="data-label__value !text-xs"
                  :class="vehicle.BatteryPercentage < 20 ? 'text-danger' : 'text-muted'">
              {{ vehicle.BatteryPercentage }}%
            </span>
          </div>
          <div class="data-label">
            <span class="data-label__key">ODO</span>
            <span class="data-label__value !text-xs text-muted">
              {{ formatOdometer(vehicle.Odometer) }}
            </span>
          </div>
          <div class="data-label">
            <span class="data-label__key">POS</span>
            <span class="data-label__value !text-xs text-muted">
              {{ Number(vehicle.LastPosition?.Latitude).toFixed(3) }}°, {{ Number(vehicle.LastPosition?.Longitude).toFixed(3) }}°
            </span>
          </div>
          <div class="data-label ml-auto">
            <span class="data-label__key">LAST</span>
            <span class="data-label__value !text-xs" :class="getTimeAgoColor(vehicle.LastPositionTimestamp)">
              {{ formatTimeAgo(vehicle.LastPositionTimestamp) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="filteredVehicles.length === 0" class="py-12 text-center">
        <div class="text-muted text-xs font-mono">
          {{ ui.activeTab === 'crew' ? 'NO CREW MEMBERS — LONG-PRESS A VEHICLE TO ADD' : 'NO VEHICLES FOUND' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronRight } from 'lucide-vue-next'
import { useGroups, useVehicles } from '@/api/endpoints/vehicles'
import { useVehicleStore } from '@/stores/vehicleStore'
import { useUiStore } from '@/stores/uiStore'
import type { ApiVehicle } from '@/api/types'

const router = useRouter()
const vehicleStore = useVehicleStore()
const ui = useUiStore()

// Fetch groups
const { data: groups } = useGroups()
const activeGroup = computed(() => groups.value?.[0])
const activeGroupCode = computed(() => activeGroup.value?.Code)

// Fetch vehicles with 15s auto-refresh
const {
  data: vehiclesData,
  isLoading: vehiclesLoading,
  error: vehiclesError,
  refetch: vehiclesRefetch,
} = useVehicles(activeGroupCode)

// Apply crew enrichment when data arrives
const enrichedVehicles = computed(() => {
  if (!vehiclesData.value) return []
  return vehiclesData.value.map((v) => ({
    ...v,
    isTeammate: vehicleStore.crewVehicleCodes.has(v.Code),
    isMoving: v.Speed > 0,
  }))
})

const filteredVehicles = computed(() => {
  if (ui.activeTab === 'crew') {
    return enrichedVehicles.value.filter((v) => v.isTeammate)
  }
  return enrichedVehicles.value
})

function openVehicle(vehicle: ApiVehicle) {
  vehicleStore.setActiveVehicle(vehicle.Code)
  router.push(`/trips/${vehicle.Code}`)
}

function formatOdometer(meters: number): string {
  if (!meters) return '--'
  const km = meters / 1000
  if (km > 1000) return `${(km / 1000).toFixed(0)}k km`
  return `${km.toFixed(0)} km`
}

function formatTimeAgo(timestamp: string): string {
  if (!timestamp) return '--'
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

function getTimeAgoColor(timestamp: string): string {
  if (!timestamp) return 'text-dim'
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  if (seconds < 120) return 'text-volt'
  if (seconds < 3600) return 'text-muted'
  return 'text-danger'
}
</script>
