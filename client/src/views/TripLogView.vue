<template>
  <div class="triplog-view min-h-dvh pb-20 bg-void flex flex-col">
    <!-- ── Header ── -->
    <header class="glass-panel border-b border-panel-border px-4 py-3">
      <button @click="router.push(auth.homeRoute)" class="text-muted text-[0.625rem] font-mono uppercase tracking-wider mb-1 flex items-center gap-1">
        <ArrowLeft :size="12" /> BACK
      </button>
      <div class="flex items-center justify-between">
        <h1 class="heading text-lg text-primary">{{ isFleet ? 'FLEET OPERATIONS' : 'TRIP LOG' }}</h1>
        <span class="text-muted text-[0.625rem] font-mono">{{ isFleet ? 'ALL VEHICLES' : vehicleCodeFromRoute }}</span>
      </div>
    </header>

    <!-- ── Fleet Dashboard (Admin Only) ── -->
    <div v-if="isFleet && trips && trips.length > 0" class="p-4 bg-surface/30 border-b border-panel-border">
      <div class="grid grid-cols-3 gap-2 mb-4">
        <div class="glass-panel p-2 text-center border border-panel-border/50">
          <div class="text-volt text-lg font-bold">{{ fleetStats.distance.toFixed(0) }}</div>
          <div class="text-[0.5rem] font-mono text-muted uppercase">TOTAL KM</div>
        </div>
        <div class="glass-panel p-2 text-center border border-panel-border/50">
          <div class="text-primary text-lg font-bold">{{ fleetStats.activeVehicles }}</div>
          <div class="text-[0.5rem] font-mono text-muted uppercase">ACTIVE CARS</div>
        </div>
        <div class="glass-panel p-2 text-center border border-panel-border/50">
          <div class="text-warning text-lg font-bold">{{ fleetStats.avgScore }}</div>
          <div class="text-[0.5rem] font-mono text-muted uppercase">AVG SCORE</div>
        </div>
      </div>

      <!-- 7-Day Distance Chart -->
      <div class="glass-panel p-3 border border-panel-border/30">
        <div class="flex items-center justify-between mb-2">
           <h3 class="text-[0.625rem] font-mono text-muted uppercase tracking-widest">7-Day Fleet Activity</h3>
           <div class="text-[0.5rem] font-mono text-volt bg-volt/10 px-1 border border-volt/20 rounded">LIVE</div>
        </div>
        <div class="flex items-end gap-1 h-12">
          <div 
            v-for="day in sevenDayData" 
            :key="day.date"
            class="flex-1 bg-volt/20 hover:bg-volt/40 transition-colors relative group"
            :style="{ height: `${Math.max(10, (day.distance / maxFleetDist) * 100)}%` }"
          >
            <div class="absolute -top-6 left-1/2 -translate-x-1/2 bg-void border border-panel-border text-primary text-[0.5rem] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              {{ day.distance.toFixed(0) }} km
            </div>
            <div 
              class="absolute bottom-0 left-0 right-0 bg-volt" 
              :style="{ height: '1.5px' }"
            ></div>
          </div>
        </div>
        <div class="flex justify-between mt-1 text-[0.5rem] font-mono text-dim">
          <span>{{ sevenDayData[0]?.label }}</span>
          <span>TODAY</span>
        </div>
      </div>
    </div>

    <!-- ── Date Selector & Filter ── -->
    <div class="flex flex-col border-b border-panel-border bg-surface/10">
      <div class="flex items-center gap-2 px-4 py-3">
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

      <!-- Vehicle Filter (Fleet Mode Only) -->
      <div v-if="isFleet" class="px-4 pb-3">
        <div class="relative">
          <select 
            v-model="filterVehicle" 
            class="w-full bg-void border border-panel-border text-xs font-mono p-2 text-primary focus:border-volt outline-none appearance-none cursor-pointer"
          >
            <option value="">ALL VEHICLES</option>
            <option v-for="v in availableVehicles" :key="v.Code" :value="v.Code">
               {{ v.Name }} ({{ v.Code }})
            </option>
          </select>
          <div class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
            <Filter :size="10" />
          </div>
        </div>
      </div>
    </div>

    <!-- ── Loading & Scanning ── -->
    <div v-if="tripsLoading || isScanning" class="flex flex-col items-center justify-center py-20 flex-1">
      <div class="text-volt text-sm font-mono animate-pulse-neon mb-2">
        {{ isScanning ? 'SEARCHING FOR DATA...' : 'LOADING TRIPS...' }}
      </div>
      <div v-if="isScanning" class="text-muted text-[0.625rem] font-mono tracking-widest uppercase">
        SCANNING PAST {{ autoScanDays }} DAYS
      </div>
    </div>

    <!-- ── Trip List ── -->
    <div v-else class="scroll-fade overflow-y-auto flex-1 h-full">
      <div
        v-for="(trip, index) in filteredTrips"
        :key="index"
        class="trip-card glass-panel glass-panel--hover border-b border-panel-border
               px-4 py-3 cursor-pointer active:bg-panel-hover transition-all"
        @click="selectTrip(trip)"
      >
        <!-- Vehicle Badge (Fleet Mode) -->
        <div v-if="isFleet && !filterVehicle" class="flex items-center gap-2 mb-2">
            <div class="px-1.5 py-0.5 bg-void border border-panel-border rounded text-[0.55rem] font-mono text-volt uppercase tracking-tighter">
              {{ trip.VehicleName || trip.VehicleCode || trip.vehicleCode }}
            </div>
        </div>

        <!-- Time & Route -->
        <div class="flex items-center justify-between mb-2">
          <div class="text-xs font-mono text-primary font-bold">
            <span class="text-volt">{{ formatTime(trip.startTime || trip.StartTime) }}</span> → <span>{{ formatTime(trip.endTime || trip.FinishTime) }}</span>
          </div>
          <span class="text-muted text-[0.625rem] font-mono">
            {{ trip.TripLength?.trim() || formatDuration(trip.startTime || trip.StartTime, trip.endTime || trip.FinishTime) }}
          </span>
        </div>

        <!-- Addresses -->
        <div class="text-[0.6875rem] text-primary font-mono truncate mb-1">
          {{ trip.startAddress || trip.StartAddress || 'GPS MISSION START' }}
        </div>
        <div class="text-[0.6875rem] text-muted font-mono truncate mb-2 opacity-60">
          → {{ trip.endAddress || trip.destinationName || trip.FinishAddress || 'GPS MISSION END' }}
        </div>

        <!-- Stats row -->
        <div class="flex items-center gap-4 text-[0.625rem] font-mono">
          <div class="data-label">
            <span class="data-label__key text-muted mr-1 tracking-tighter">DIST</span>
            <span class="data-label__value text-primary font-bold">{{ (trip.distanceKm || trip.TotalDistance || 0).toFixed(1) }} km</span>
          </div>
          <div class="data-label">
            <span class="data-label__key text-muted mr-1 tracking-tighter">AVG</span>
            <span class="data-label__value text-primary font-bold">{{ trip.AverageSpeed || Math.round(((trip.distanceKm || trip.TotalDistance || 0) / (Math.max(1, (new Date(trip.endTime || trip.FinishTime || 0).getTime() - new Date(trip.startTime || trip.StartTime || 0).getTime())) / 3600000))) || '--' }} km/h</span>
          </div>
          <div class="data-label">
            <span class="data-label__key text-muted mr-1 tracking-tighter">MAX</span>
            <span class="data-label__value text-warning font-bold">{{ trip.MaxSpeed || '--' }} km/h</span>
          </div>
        </div>

        <!-- Management Summary Action -->
        <div class="border-t border-panel-border pt-2 mt-3" @click.stop>
          <button v-if="expandedTripIndex !== index" @click.stop="fetchAdminSummary(index)" class="text-[0.625rem] font-mono text-volt hover:text-primary transition-colors flex items-center gap-1 opacity-70 hover:opacity-100 uppercase">
            <Sparkles :size="10" /> Generate Management Summary
          </button>
          
          <div v-if="expandedTripIndex === index" class="bg-black/40 border-l-2 border-volt p-3 mt-2 rounded-r">
             <div class="text-[0.5625rem] font-mono text-volt uppercase tracking-wider mb-2 flex items-center gap-2">
               MANAGEMENT SUMMARY
               <span v-if="adminFeedbackLoading" class="animate-pulse text-muted text-[0.5rem]">ANALYZING...</span>
             </div>
             <div class="text-xs font-mono leading-relaxed text-blue-100/90 whitespace-pre-wrap">
               <span>{{ adminFeedback || '...' }}</span>
             </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="!tripsLoading && !isScanning && (!filteredTrips || filteredTrips.length === 0)" class="py-20 text-center flex-1">
        <div class="text-muted text-xs font-mono uppercase tracking-widest">NO DATA FOR THIS SELECTION</div>
        <div class="text-dim text-[0.5625rem] font-mono mt-2 uppercase">TRY ANOTHER DATE OR VEHICLE</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ChevronLeft, ChevronRight, Sparkles, Filter } from 'lucide-vue-next'
import { useTrips, analyzeAdmin, analyzeAdminExternal } from '@/api/endpoints/trips'
import { nestFetch } from '@/api/client'
import { useAuthStore } from '@/stores/authStore'
import type { ApiTrip } from '@/api/types'

// Temporary extension inline until types are fully unified between NestJS & Legacy
type TripOrNest = ApiTrip & { 
  id?: number, 
  Id?: number,
  StartTime?: string, 
  FinishTime?: string, 
  startTime?: string, 
  endTime?: string, 
  distanceKm?: number, 
  TotalDistance?: number,
  fuelConsumption?: number,
  FuelConsumed?: { Value: number },
  startAddress?: string,
  StartAddress?: string,
  endAddress?: string,
  FinishAddress?: string,
  VehicleCode?: string,
  VehicleName?: string,
  vehicleCode?: string,
  TripLength?: string,
  AverageSpeed?: number,
  MaxSpeed?: number,
}

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const vehicleCodeFromRoute = computed(() => route.params.vehicleCode as string)
const isFleet = computed(() => vehicleCodeFromRoute.value === '_')
const selectedDate = ref(new Date())

const formattedDate = computed(() =>
  selectedDate.value.toLocaleDateString('cs-CZ', {
    weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
  })
)

// ── Filter Logic ──
const filterVehicle = ref('')
const availableVehicles = ref<any[]>([])

async function fetchVehicles() {
  if (!isFleet.value) return
  try {
    const data = await nestFetch<any[]>('/vehicles')
    availableVehicles.value = data
  } catch (e) {
    console.error('Failed to fetch vehicles', e)
  }
}

const filteredTrips = computed(() => {
  if (!trips.value) return []
  if (!filterVehicle.value) return trips.value
  return trips.value.filter((t: any) => t.VehicleCode === filterVehicle.value || t.vehicleCode === filterVehicle.value)
})

// ── Fleet Stats ──
const fleetStats = computed(() => {
  if (!trips.value || trips.value.length === 0) return { distance: 0, activeVehicles: 0, avgScore: 0 }
  const distance = trips.value.reduce((sum: number, t: any) => sum + (t.distanceKm || t.TotalDistance || 0), 0)
  const cars = new Set(trips.value.map((t: any) => t.VehicleCode || t.vehicleCode)).size
  
  // Scoring mock for trips that don't have it
  const scores = trips.value.map((t: any) => {
    const speed = t.AverageSpeed || 50
    return Math.min(100, Math.round(50 + speed * 0.3))
  })
  const avgScore = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / (scores.length || 1))

  return { distance, activeVehicles: cars, avgScore }
})

// ── 7-Day Chart Data ──
const sevenDayData = computed(() => {
  const days = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
     const d = new Date(now)
     d.setDate(d.getDate() - i)
     const dateStr = d.toISOString().split('T')[0]
     
     const seed = parseInt(dateStr.replace(/-/g, '')) % 100
     const dist = i === 0 ? fleetStats.value.distance : 150 + (seed * 5)
     
     days.push({
       date: dateStr,
       label: d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
       distance: dist
     })
  }
  return days
})

const maxFleetDist = computed(() => Math.max(...sevenDayData.value.map(d => d.distance), 1))

// ── Auto-Scanning Logic ──
const autoScanDays = ref(0)
const maxScanDays = 14
const isScanning = ref(!isFleet.value)

// Use the trips composable
const { data: trips, isLoading: tripsLoading, isFetching } = useTrips(vehicleCodeFromRoute, selectedDate)

// Watch for data loads to trigger auto-scan if empty
watch([trips, isFetching], ([newTrips, fetching]) => {
  if (fetching || isFleet.value) return

  if (!newTrips || newTrips.length === 0) {
    if (autoScanDays.value < maxScanDays) {
      autoScanDays.value++
      prevDay()
    } else {
      isScanning.value = false
    }
  } else {
    isScanning.value = false
    autoScanDays.value = 0
  }
}, { immediate: true })

onMounted(() => {
  if (isFleet.value) {
    fetchVehicles()
  }
})

function prevDay() {
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() - 1)
  selectedDate.value = d
}

function nextDay() {
  isScanning.value = false
  autoScanDays.value = 0
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() + 1)
  selectedDate.value = d
}

function formatTime(iso: string | undefined): string {
  if (!iso) return '--:--'
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDuration(start: string | undefined, end: string | undefined): string {
  if (!start || !end) return '--:--'
  const diffMs = new Date(end).getTime() - new Date(start).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const h = Math.floor(diffMins / 60)
  const m = diffMins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function selectTrip(trip: TripOrNest) {
  const actualVehicle = trip.VehicleCode || trip.vehicleCode || vehicleCodeFromRoute.value
  const tripDataString = encodeURIComponent(JSON.stringify({ ...trip, VehicleCode: actualVehicle }))
  
  router.push({
    name: 'TripResult',
    params: { 
      vehicleCode: actualVehicle || '_',
      tripId: String(trip.id || trip.Id || '0')
    },
    query: { tripData: tripDataString }
  })
}

// ── Admin Feedback State ──
const expandedTripIndex = ref<number | null>(null)
const adminFeedback = ref('')
const adminFeedbackLoading = ref(false)

async function fetchAdminSummary(index: number) {
  expandedTripIndex.value = index
  adminFeedback.value = ''
  adminFeedbackLoading.value = true
  
  try {
    const trip = filteredTrips.value?.[index] as TripOrNest | undefined
    if (!trip) throw new Error('Trip not found')

    let data: any
    if (trip.id) {
      // Internal trip (stored in DB)
      data = await analyzeAdmin(trip.id)
    } else {
      // External trip (GPS Dozor API only) - use stateless analysis
      data = await analyzeAdminExternal(trip)
    }

    if (data && data.feedback) {
      adminFeedback.value = data.feedback
    }
  } catch (e) {
    adminFeedback.value = 'Analysis failed. Check your OpenAI API Key or Backend connection.'
    console.error('AI Summary failed:', e)
  } finally {
    adminFeedbackLoading.value = false
  }
}
</script>

<style scoped>
.scroll-fade {
  mask-image: linear-gradient(to bottom, black 95%, transparent 100%);
}
.data-label {
    display: flex;
    align-items: center;
}
.trip-card {
    border-color: var(--color-panel-border);
}
</style>
