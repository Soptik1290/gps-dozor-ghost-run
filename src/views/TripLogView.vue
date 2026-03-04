<template>
  <div class="triplog-view min-h-dvh pb-20 bg-void">
    <!-- ── Header ── -->
    <header class="glass-panel border-b border-panel-border px-4 py-3">
      <button @click="router.back()" class="text-muted text-[0.625rem] font-mono uppercase tracking-wider mb-1 flex items-center gap-1">
        <ArrowLeft :size="12" /> BACK
      </button>
      <div class="flex items-center justify-between">
        <h1 class="heading text-lg text-primary">TRIP LOG</h1>
        <span class="text-muted text-[0.625rem] font-mono">{{ vehicleCode }}</span>
      </div>
    </header>

    <!-- ── Date Selector ── -->
    <div class="flex items-center gap-2 px-4 py-3 border-b border-panel-border">
      <button @click="prevDay" class="btn btn--ghost !p-2 !min-h-[36px] !min-w-[36px]">
        <ChevronLeft :size="16" />
      </button>
      <div class="flex-1 text-center text-sm font-mono text-primary">
        {{ formattedDate }}
      </div>
      <button @click="nextDay" class="btn btn--ghost !p-2 !min-h-[36px] !min-w-[36px]">
        <ChevronRight :size="16" />
      </button>
    </div>

    <!-- ── Loading ── -->
    <div v-if="tripsLoading" class="flex items-center justify-center py-20">
      <div class="text-volt text-sm font-mono animate-pulse-neon">LOADING TRIPS...</div>
    </div>

    <!-- ── Trip List ── -->
    <div v-else class="scroll-fade overflow-y-auto" style="max-height: calc(100dvh - 200px);">
      <div
        v-for="(trip, index) in trips"
        :key="index"
        class="trip-card glass-panel glass-panel--hover border-b border-panel-border
               px-4 py-3 cursor-pointer active:bg-panel-hover transition-all"
        @click="selectTrip(trip)"
      >
        <!-- Time & Route -->
        <div class="flex items-center justify-between mb-2">
          <div class="text-xs font-mono text-volt font-bold">
            {{ formatTime(trip.StartTime) }} → {{ formatTime(trip.FinishTime) }}
          </div>
          <span class="text-muted text-[0.625rem] font-mono">
            {{ trip.TripLength?.trim() || '--:--' }}
          </span>
        </div>

        <!-- Addresses -->
        <div class="text-[0.6875rem] text-primary font-mono truncate mb-1">
          {{ trip.StartAddress || 'Unknown origin' }}
        </div>
        <div class="text-[0.6875rem] text-muted font-mono truncate mb-2">
          → {{ trip.FinishAddress || 'Unknown destination' }}
        </div>

        <!-- Stats row -->
        <div class="flex items-center gap-4 text-[0.625rem] font-mono">
          <div class="data-label">
            <span class="data-label__key">DIST</span>
            <span class="data-label__value !text-xs">{{ trip.TotalDistance?.toFixed(1) }} km</span>
          </div>
          <div class="data-label">
            <span class="data-label__key">AVG</span>
            <span class="data-label__value !text-xs">{{ trip.AverageSpeed }} km/h</span>
          </div>
          <div class="data-label">
            <span class="data-label__key">MAX</span>
            <span class="data-label__value !text-xs text-warning">{{ trip.MaxSpeed }} km/h</span>
          </div>
          <div v-if="trip.FuelConsumed?.Value" class="data-label">
            <span class="data-label__key">FUEL</span>
            <span class="data-label__value !text-xs text-muted">{{ trip.FuelConsumed.Value.toFixed(1) }} L</span>
          </div>
          <div v-if="trip.DriverName" class="data-label ml-auto">
            <span class="data-label__key">DRIVER</span>
            <span class="data-label__value !text-xs truncate max-w-[80px]">{{ trip.DriverName }}</span>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="!tripsLoading && (!trips || trips.length === 0)" class="py-12 text-center">
        <div class="text-muted text-xs font-mono">NO TRIPS RECORDED FOR THIS DAY</div>
        <div class="text-dim text-[0.5625rem] font-mono mt-1">TRY SELECTING A DIFFERENT DATE</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useTrips } from '@/api/endpoints/trips'
import type { ApiTrip } from '@/api/types'

const route = useRoute()
const router = useRouter()

const vehicleCode = computed(() => route.params.vehicleCode as string)
const selectedDate = ref(new Date())

const formattedDate = computed(() =>
  selectedDate.value.toLocaleDateString('cs-CZ', {
    weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
  })
)

// Use the trips composable
const { data: trips, isLoading: tripsLoading } = useTrips(vehicleCode, selectedDate)

function prevDay() {
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() - 1)
  selectedDate.value = d
}

function nextDay() {
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() + 1)
  selectedDate.value = d
}

function formatTime(iso: string): string {
  if (!iso) return '--:--'
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function selectTrip(trip: ApiTrip) {
  router.push({
    name: 'GhostRun',
    params: { vehicleCode: vehicleCode.value },
    query: { from: trip.StartTime, to: trip.FinishTime },
  })
}
</script>
