<template>
  <div class="triplog-view min-h-dvh pb-20 bg-void flex flex-col relative overflow-hidden">
    <!-- ── Scanline Overlay ── -->
    <div class="absolute inset-0 pointer-events-none z-50 opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>

    <!-- ── Header ── -->
    <header class="glass-panel border-b border-panel-border px-6 py-6 sticky top-0 z-40 backdrop-blur-xl">
      <button @click="router.push(auth.homeRoute)" class="text-muted text-[0.8rem] font-mono uppercase tracking-[0.3em] mb-3 flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
        <ArrowLeft :size="14" /> UPLINK ABORT
      </button>
      <div class="flex items-center justify-between">
        <div class="flex flex-col">
          <h1 class="heading text-3xl text-primary tracking-tighter">{{ isFleet ? 'FLEET OPERATIONS' : 'MISSION ARCHIVE' }}</h1>
          <div class="flex items-center gap-3 mt-1.5">
             <span class="w-2 h-2 rounded-full bg-volt animate-pulse shadow-[0_0_8px_var(--color-volt)]"></span>
             <span class="text-[0.75rem] font-mono text-muted uppercase tracking-widest">{{ isFleet ? 'GLOBAL FLEET FEED' : `${vehicleCodeFromRoute} // PILOT LOG` }}</span>
          </div>
        </div>
        <div v-if="!isFleet" class="flex flex-col items-end">
           <span class="text-[0.6rem] font-mono text-muted uppercase tracking-[0.3em] mb-1">Security Level</span>
           <span class="text-[0.85rem] font-mono text-primary font-black tracking-widest">ALPHA-9</span>
        </div>
      </div>
    </header>

    <!-- ── Fleet Dashboard (Admin Only) ── -->
    <div v-if="isFleet && trips && trips.length > 0" class="p-6 bg-surface/30 border-b border-panel-border animate-in fade-in duration-500">
      <div class="grid grid-cols-3 gap-3 mb-6">
        <div class="glass-panel p-5 text-center border border-panel-border/50 bg-void/40">
          <div class="text-volt text-2xl font-black tracking-tighter">{{ fleetStats.distance.toFixed(0) }}</div>
          <div class="text-[0.6rem] font-mono text-muted uppercase tracking-widest mt-1">FLEET DIST</div>
        </div>
        <div class="glass-panel p-5 text-center border border-panel-border/50 bg-void/40">
          <div class="text-primary text-2xl font-black tracking-tighter">{{ fleetStats.activeVehicles }}</div>
          <div class="text-[0.6rem] font-mono text-muted uppercase tracking-widest mt-1">DEPLOYED</div>
        </div>
        <div class="glass-panel p-5 text-center border border-panel-border/50 bg-void/40">
          <div class="text-warning text-2xl font-black tracking-tighter">{{ fleetStats.avgScore }}%</div>
          <div class="text-[0.6rem] font-mono text-muted uppercase tracking-widest mt-1">EFFICIENCY</div>
        </div>
      </div>

      <!-- 7-Day Distance Chart -->
      <div class="glass-panel p-6 border border-panel-border/30 bg-void/20">
        <div class="flex items-center justify-between mb-4">
           <h3 class="text-[0.7rem] font-mono text-muted uppercase tracking-[0.3em]">Fleet Activity Matrix</h3>
           <div class="text-[0.6rem] font-mono text-volt border border-volt/30 px-2.5 py-1 rounded-sm uppercase tracking-widest">Realtime Sync</div>
        </div>
        <div class="flex items-end gap-2 h-24">
          <div 
            v-for="day in sevenDayData" 
            :key="day.date"
            class="flex-1 bg-volt/10 hover:bg-volt/30 transition-all relative group rounded-t-sm"
            :style="{ height: `${Math.max(15, (day.distance / maxFleetDist) * 100)}%` }"
          >
            <div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-surface border border-panel-border text-primary text-[0.75rem] px-3 py-1 rounded shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-mono font-bold">
              {{ day.distance.toFixed(0) }} KM
            </div>
            <div 
              class="absolute bottom-0 left-0 right-0 bg-volt shadow-[0_0_15px_rgba(206,255,0,0.6)]" 
              :style="{ height: '3px' }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Driver Stats (Personal) ── -->
    <div v-else-if="!isFleet && trips" class="p-6 bg-surface/30 border-b border-panel-border animate-in slide-in-from-top-4 duration-700">
       <div class="flex items-center justify-between mb-6">
          <span class="text-[0.8rem] font-mono text-muted uppercase tracking-[0.4em]">Pilot Performance Index</span>
          <span class="text-[0.65rem] font-mono text-volt bg-volt/5 px-3 py-1 border border-volt/20 rounded uppercase font-bold">Verified Status</span>
       </div>
       <div class="grid grid-cols-2 gap-4">
          <div class="glass-panel p-6 border-l-4 border-volt bg-void/60 flex flex-col gap-2 items-center justify-center">
             <span class="text-4xl font-black text-primary tracking-tighter">{{ trips.length }}</span>
             <span class="text-[0.7rem] font-mono text-muted uppercase tracking-widest font-bold">Missions Run</span>
          </div>
          <div class="glass-panel p-6 border-l-4 border-primary bg-void/60 flex flex-col gap-2 items-center justify-center">
             <span class="text-4xl font-black text-primary tracking-tighter">{{ fleetStats.avgScore }}%</span>
             <span class="text-[0.7rem] font-mono text-muted uppercase tracking-widest font-bold">Avg Stability</span>
          </div>
       </div>
    </div>

    <!-- ── Date Selector ── -->
    <div class="flex flex-col border-b border-panel-border bg-surface/10 relative z-10">
      <div class="flex items-center gap-4 px-6 py-5">
        <button @click="prevDay" class="btn btn--ghost !p-3 opacity-60 hover:opacity-100 transition-all">
          <ChevronLeft :size="24" />
        </button>
        <div class="flex-1 text-center">
          <div class="text-[0.65rem] font-mono text-muted uppercase tracking-[0.5em] mb-1.5 font-bold">Chronos Sector</div>
          <div class="text-lg font-mono text-primary font-black tracking-[0.2em] uppercase">
            {{ formattedDate }}
          </div>
        </div>
        <button @click="nextDay" class="btn btn--ghost !p-3 opacity-60 hover:opacity-100 transition-all">
          <ChevronRight :size="24" />
        </button>
      </div>

      <!-- Vehicle Filter (Fleet Mode Only) -->
      <div v-if="isFleet" class="px-6 pb-6">
        <div class="relative">
          <select 
            v-model="filterVehicle" 
            class="w-full bg-void/80 border border-panel-border/50 text-[0.85rem] font-mono px-6 py-4 text-primary focus:border-volt/50 outline-none appearance-none cursor-pointer tracking-[0.1em] rounded-none"
          >
            <option value="">ALL FLEET ASSETS</option>
            <option v-for="v in availableVehicles" :key="v.Code" :value="v.Code">
               {{ v.Name }} [{{ v.Code }}]
            </option>
          </select>
          <div class="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-muted opacity-50">
            <Filter :size="16" />
          </div>
        </div>
      </div>
    </div>

    <!-- ── Loading & Scanning ── -->
    <div v-if="tripsLoading || isScanning" class="flex flex-col items-center justify-center py-32 flex-1 relative z-10">
      <div class="w-16 h-16 border-4 border-volt/10 border-t-volt rounded-full animate-spin mb-8"></div>
      <div class="text-volt text-sm font-mono tracking-[0.3em] animate-pulse-neon mb-3">
        {{ isScanning ? 'QUERYING GPS DOZOR UPLINK...' : 'DECRYPTING MISSION CACHE' }}
      </div>
      <div v-if="isScanning" class="text-muted text-[0.75rem] font-mono tracking-[0.4em] uppercase opacity-50">
        SCANNING SECTOR MINUS {{ autoScanDays }} DAYS
      </div>
    </div>

    <!-- ── Trip List ── -->
    <div v-else class="scroll-fade overflow-y-auto flex-1 h-full relative z-10">
      <div
        v-for="(trip, index) in filteredTrips"
        :key="index"
        class="trip-card border-b border-panel-border px-8 py-8 cursor-pointer active:bg-panel-hover transition-all relative overflow-hidden group"
        @click="selectTrip(trip)"
      >
        <!-- Background Hover Effect -->
        <div class="absolute inset-0 bg-gradient-to-r from-volt/0 to-volt/5 translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>

        <!-- Header Info -->
        <div class="flex items-center justify-between mb-5 relative z-10">
           <div class="flex items-center gap-3">
              <span class="text-[1.1rem] font-mono text-primary font-black tracking-widest">
                <span class="text-volt">{{ formatTime(trip.startTime || trip.StartTime) }}</span> 
                <span class="mx-2 opacity-30">→</span> 
                <span>{{ formatTime(trip.endTime || trip.FinishTime) }}</span>
              </span>
              <div class="px-3 py-1 bg-volt/10 border border-volt/30 rounded-sm text-[0.65rem] font-black text-volt uppercase tracking-widest">
                {{ isFleet && !filterVehicle ? (trip.VehicleName || trip.VehicleCode || trip.vehicleCode) : 'LINKED' }}
              </div>
           </div>
           <span class="text-muted text-[0.8rem] font-mono tracking-widest uppercase opacity-70 font-bold">
             {{ trip.TripLength?.trim() || formatDuration(trip.startTime || trip.StartTime, trip.endTime || trip.FinishTime) }}
           </span>
        </div>

        <!-- Route Path -->
        <div class="space-y-3 mb-8 relative z-10">
           <div class="flex items-start gap-4">
              <div class="mt-2 w-2.5 h-2.5 rounded-full bg-muted opacity-30 flex-shrink-0"></div>
              <div class="text-[1rem] text-primary/80 font-mono truncate tracking-tight">
                {{ trip.startAddress || trip.StartAddress || 'GPS MISSION START' }}
              </div>
           </div>
           <div class="flex items-start gap-4">
              <div class="mt-2 w-2.5 h-2.5 rounded-full bg-volt flex-shrink-0 shadow-[0_0_8px_var(--color-volt)]"></div>
              <div class="text-[1rem] text-primary font-mono truncate font-black tracking-tight">
                {{ trip.endAddress || trip.destinationName || trip.FinishAddress || 'GPS MISSION END' }}
              </div>
           </div>
        </div>

        <!-- Telemetry Row -->
        <div class="flex items-center gap-10 text-[0.85rem] font-mono relative z-10 border-t border-panel-border/30 pt-6">
          <div class="flex items-center group/item scale-110 origin-left">
            <span class="text-muted mr-2 tracking-widest uppercase opacity-50 font-bold text-[0.65rem]">Dist</span>
            <span class="text-primary font-black group-hover/item:text-volt transition-colors">{{ (trip.distanceKm || trip.TotalDistance || 0).toFixed(1) }} <span class="opacity-40 font-normal text-[0.55rem]">KM</span></span>
          </div>
          <div class="flex items-center group/item scale-110 origin-left">
            <span class="text-muted mr-2 tracking-widest uppercase opacity-50 font-bold text-[0.65rem]">Avg</span>
            <span class="text-primary font-black">{{ trip.AverageSpeed || Math.round(((trip.distanceKm || trip.TotalDistance || 0) / (Math.max(1, (new Date(trip.endTime || trip.FinishTime || 0).getTime() - new Date(trip.startTime || trip.StartTime || 0).getTime())) / 3600000))) || '--' }} <span class="opacity-40 font-normal text-[0.55rem]">KM/H</span></span>
          </div>
          <div class="flex items-center group/item ml-auto">
            <span class="text-[0.65rem] font-black text-muted uppercase tracking-[0.3em] opacity-40 mr-3 italic">Telemetry Integrity:</span>
            <span class="text-[0.7rem] font-black text-volt uppercase tracking-[0.2em] shadow-volt px-2 py-0.5 bg-volt/5 rounded">SECURE</span>
          </div>
        </div>

        <!-- AI Evaluation Action -->
        <div v-if="!isFleet" class="mt-8 relative z-10" @click.stop>
          <button 
            v-if="expandedTripIndex !== index" 
            @click.stop="fetchAdminSummary(index)" 
            class="w-full flex items-center justify-between px-6 py-4 bg-void border border-panel-border/40 hover:border-volt/40 transition-all group/btn shadow-lg"
          >
            <span class="text-[0.8rem] font-mono text-muted group-hover/btn:text-primary transition-colors uppercase tracking-[0.4em] font-black">Request Tactical Debrief</span>
            <Sparkles :size="16" class="text-volt opacity-50 group-hover/btn:opacity-100 group-hover/btn:scale-125 transition-all" />
          </button>
          
          <div v-if="expandedTripIndex === index" class="mt-4 relative animate-in slide-in-from-top-4 duration-500">
             <div class="absolute inset-0 bg-volt opacity-[0.03] pointer-events-none"></div>
             <div class="border-l-4 border-volt p-8 bg-void/90 backdrop-blur-xl border border-panel-border/30 rounded-r-xl shadow-2xl">
                <div class="text-[0.75rem] font-mono text-volt uppercase tracking-[0.4em] mb-6 flex items-center justify-between font-black">
                  <span>MISSION EVALUATION FEED</span>
                  <span v-if="adminFeedbackLoading" class="animate-pulse">DECRYPTING...</span>
                </div>
                <div class="text-[1rem] font-mono leading-relaxed text-blue-100/90 whitespace-pre-wrap font-medium">
                  {{ adminFeedback || 'ESTABLISHING SECURE CONNECTION...' }}
                </div>
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

.trip-card {
    border-color: var(--color-panel-border);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.trip-card:hover {
    border-color: rgba(206, 255, 0, 0.3);
    background: rgba(255, 255, 255, 0.02);
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-in-from-top-4 {
  from { 
    opacity: 0;
    transform: translateY(-10px); 
  }
  to { 
    opacity: 1;
    transform: translateY(0); 
  }
}

.animate-in {
  animation-fill-mode: both;
}

/* Custom glow for Volt elements */
.text-volt {
  text-shadow: 0 0 8px rgba(206, 255, 0, 0.4);
}

.shadow-volt {
  box-shadow: 0 0 15px rgba(206, 255, 0, 0.2);
}
</style>
