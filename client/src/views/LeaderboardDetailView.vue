<template>
  <div class="leaderboard-detail min-h-dvh pb-20 bg-void">
    <!-- Header -->
    <header class="glass-panel border-b border-panel-border px-4 py-4">
      <button @click="router.push('/leaderboard')" class="text-muted hover:text-primary transition-colors mb-3 flex items-center gap-1">
        <ArrowLeft :size="16" /> BACK
      </button>
      <div class="flex items-center gap-4">
        <div class="score-badge score-badge--lg" :class="getScoreClass(vehicleScore)">
          {{ vehicleScore }}
        </div>
        <div>
          <h1 class="heading text-lg text-primary">{{ vehicleName }}</h1>
          <div class="text-xs font-mono text-muted">{{ branchName }} • {{ tripCount }} trips</div>
        </div>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20">
      <div class="w-8 h-8 border-4 border-volt/20 border-t-volt rounded-full animate-spin mb-4"></div>
      <div class="text-volt text-xs font-mono animate-pulse">LOADING DATA...</div>
    </div>

    <!-- Content -->
    <div v-else>
      <!-- Tabs -->
      <div class="flex border-b border-panel-border">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        @click="activeTab = tab.id"
        class="flex-1 py-3 text-xs font-mono uppercase tracking-wider"
        :class="activeTab === tab.id ? 'text-volt border-b-2 border-volt' : 'text-muted'"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Trips Tab -->
    <div v-if="activeTab === 'trips'" class="p-4 space-y-3">
      <div
        v-for="trip in trips"
        :key="trip.Id"
        class="trip-card glass-panel border border-panel-border p-3 cursor-pointer"
        @click="selectTrip(trip)"
      >
        <div class="flex items-center justify-between mb-2">
          <div class="text-xs font-mono text-volt">
            {{ formatDate(trip.StartTime) }}
          </div>
          <div class="score-badge text-xs" :class="getScoreClass(calculateTripScore(trip))">
            {{ calculateTripScore(trip) }}
          </div>
        </div>
        <div class="text-xs text-muted font-mono">
          {{ trip.StartAddress || 'Start' }} → {{ trip.FinishAddress || 'End' }}
        </div>
        <div class="flex gap-4 mt-2 text-[0.625rem] font-mono">
          <span>{{ trip.TotalDistance?.toFixed(1) }} km</span>
          <span>{{ trip.AverageSpeed }} km/h avg</span>
          <span>{{ trip.TripLength }}</span>
        </div>
      </div>
    </div>

    <!-- Map Tab -->
    <div v-if="activeTab === 'map'" class="h-[60vh] relative flex flex-col">
      <div class="px-4 py-3 bg-surface border-b border-panel-border z-20">
        <select v-model="selectedTripId" class="w-full bg-void text-primary text-xs font-mono p-2 border border-panel-border focus:border-volt focus:outline-none">
          <option value="" disabled class="bg-void text-muted">Select a trip...</option>
          <option v-for="t in trips" :key="t.Id" :value="String(t.Id)" class="bg-void text-primary">
            {{ formatDate(t.StartTime) }} ({{ t.TotalDistance?.toFixed(1) || 0 }} km)
          </option>
        </select>
      </div>
      <div class="flex-1 relative">
        <div v-if="!selectedTrip" class="absolute inset-0 bg-void/80 flex items-center justify-center z-10">
          <div class="text-volt font-mono text-sm animate-pulse-neon">SELECT A TRIP FROM THE LIST FIRST</div>
        </div>
      <MapContainer
        :reality-positions="realityPositions"
        :ghost-positions="mapboxGhostPositions"
        :eco-events="computedEcoEvents"
        :initial-center="mapCenter"
        :initial-zoom="12"
        :force-fit-bounds-on-update="true"
      />
      <div class="absolute bottom-4 left-4 z-10 glass-panel p-2 space-y-1 text-[0.625rem] font-mono pointer-events-none text-muted">
        <div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full border border-white bg-[#0033FF]"></div>REALITY</div>
        <div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full border border-black bg-[#CCFF00]"></div>GHOST ROUTE</div>
      </div>
      </div>
    </div>

    <!-- Stats Tab -->
    <div v-if="activeTab === 'stats'" class="p-4">
      <div class="glass-panel border border-panel-border p-4 mb-4">
        <h3 class="text-xs font-mono text-muted mb-3">SPEED OVER TIME</h3>
        <div class="h-32 flex items-end gap-1">
          <div 
            v-for="(speed, i) in speedHistory" 
            :key="i"
            class="flex-1 bg-volt"
            :style="{ height: `${(speed / maxSpeedVal) * 100}%`, opacity: 0.3 + (i / speedHistory.length) * 0.7 }"
          ></div>
        </div>
        <div class="flex justify-between text-[0.5rem] font-mono text-muted mt-1">
          <span>Earliest</span>
          <span>Latest</span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="glass-panel border border-panel-border p-3 text-center">
          <div class="text-2xl font-bold text-volt">{{ avgSpeed }}</div>
          <div class="text-[0.5rem] font-mono text-muted">AVG SPEED</div>
        </div>
        <div class="glass-panel border border-panel-border p-3 text-center">
          <div class="text-2xl font-bold text-volt">{{ maxSpeed }}</div>
          <div class="text-[0.5rem] font-mono text-muted">MAX SPEED</div>
        </div>
        <div class="glass-panel border border-panel-border p-3 text-center">
          <div class="text-2xl font-bold text-volt">{{ totalDistance.toFixed(0) }}</div>
          <div class="text-[0.5rem] font-mono text-muted">TOTAL KM</div>
        </div>
        <div class="glass-panel border border-panel-border p-3 text-center">
          <div class="text-2xl font-bold" :class="fuelEfficiency > 7 ? 'text-danger' : 'text-volt'">
            {{ fuelEfficiency.toFixed(1) }}
          </div>
          <div class="text-[0.5rem] font-mono text-muted">L/100KM</div>
        </div>
      </div>

      <div class="glass-panel border border-panel-border p-4">
        <h3 class="text-xs font-mono text-muted mb-3">ECO INCIDENTS</h3>
        <div class="flex items-center justify-between">
          <div class="text-[0.625rem] font-mono text-muted">TOTAL DETECTED</div>
          <div class="text-xl font-bold" :class="totalEcoEvents > 0 ? 'text-warning' : 'text-volt'">{{ totalEcoEvents }}</div>
        </div>
      </div>
    </div>

      <!-- AI Tab -->
    <div v-if="activeTab === 'ai'" class="p-4 flex flex-col h-full">
      <div class="mb-4">
        <select v-model="selectedTripId" class="w-full bg-surface text-primary text-xs font-mono p-3 border border-panel-border focus:border-volt focus:outline-none cursor-pointer hover:bg-panel-hover transition-colors">
          <option value="" disabled class="bg-void text-muted">Select a trip for AI Analysis...</option>
          <option v-for="t in trips" :key="t.Id" :value="String(t.Id)" class="bg-void text-primary">
            {{ formatDate(t.StartTime) }} ({{ t.TotalDistance?.toFixed(1) || 0 }} km)
          </option>
        </select>
      </div>

      <div v-if="!selectedTrip" class="text-center py-8">
        <div class="text-muted text-xs font-mono">PLEASE SELECT A TRIP ABOVE</div>
      </div>
      <div v-else-if="aiLoading" class="text-center py-8">
        <div class="w-8 h-8 border-4 border-volt/20 border-t-volt rounded-full animate-spin mb-4 mx-auto"></div>
        <div class="text-xs font-mono text-volt animate-pulse">GENERATING INSIGHTS...</div>
      </div>
      <div v-else class="glass-panel border border-panel-border p-5 flex-1">
        <div class="flex items-center justify-between mb-4 border-b border-panel-border pb-3">
          <h3 class="text-sm font-mono text-volt font-bold">AI TACTICAL ANALYSIS</h3>
          <span class="text-[0.6875rem] font-mono text-muted">TRIP: {{ formatDate(selectedTrip?.StartTime) }}</span>
        </div>
        <div class="text-sm font-mono leading-relaxed text-blue-100 whitespace-pre-wrap">
          {{ aiSummary || 'No data available' }}
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import MapContainer from '@/components/map/MapContainer.vue'
import { nestFetch } from '@/api/client'
import { getTripEvaluationFromGpsDozor } from '@/api/endpoints/trips'
import { useVehicleHistory } from '@/api/endpoints/history'
import { useEcoDrivingEvents } from '@/api/endpoints/ecoDriving'

const route = useRoute()
const router = useRouter()

const vehicleCode = computed(() => route.params.vehicleCode as string)

const tabs = [
  { id: 'trips', label: 'Trips' },
  { id: 'map', label: 'Map' },
  { id: 'stats', label: 'Stats' },
  { id: 'ai', label: 'AI' },
]
const activeTab = ref('trips')

// Data
const loading = ref(true)
const vehicleData = ref<any>(null)
const trips = ref<any[]>([])
const aiLoading = ref(false)
const aiSummary = ref('')

// Computed
const vehicleName = computed(() => vehicleData.value?.Name || vehicleCode.value)
const branchName = computed(() => vehicleData.value?.BranchName || '')
const tripCount = computed(() => trips.value.length)
const totalDistance = computed(() => trips.value.reduce((sum, t) => sum + (t.TotalDistance || 0), 0))
const avgSpeed = computed(() => {
  if (trips.value.length === 0) return 0
  return Math.round(trips.value.reduce((sum, t) => sum + (t.AverageSpeed || 0), 0) / trips.value.length)
})
const maxSpeed = computed(() => Math.max(...trips.value.map(t => t.MaxSpeed || 0), 0))
const vehicleScore = computed(() => {
  if (trips.value.length === 0) return 0
  const speeds = trips.value.map(t => t.AverageSpeed || 0)
  const avg = speeds.reduce((a, b) => a + b, 0) / speeds.length
  return Math.round(Math.min(100, 50 + avg * 0.3))
})
const fuelEfficiency = computed(() => {
  const totalFuel = trips.value.reduce((sum, t) => sum + (t.FuelConsumed?.Value || 0), 0)
  return totalDistance.value > 0 ? (totalFuel / totalDistance.value) * 100 : 0
})

const speedHistory = computed(() => trips.value.slice(0, 20).map(t => t.AverageSpeed || 0).reverse())
const maxSpeedVal = computed(() => Math.max(...speedHistory.value, 1))

// Let user select the active trip for Map & AI
const selectedTripId = ref<string>('')
const selectedTrip = computed(() => trips.value.find(t => String(t.Id) === selectedTripId.value) || null)

const mapTripFrom = computed(() => selectedTrip.value?.StartTime)
const mapTripTo = computed(() => selectedTrip.value?.FinishTime)

const hasMapToken = computed(() => {
  const t = import.meta.env.VITE_MAPBOX_TOKEN
  return !!t && t !== 'pk.placeholder_paste_your_token_here'
})

const { data: historyData } = useVehicleHistory(
  vehicleCode,
  mapTripFrom,
  mapTripTo
)

const { data: ecoEventsData } = useEcoDrivingEvents(
  vehicleCode,
  mapTripFrom,
  mapTripTo
)

const realityPositions = computed<any[]>(() => {
  if (historyData.value) {
    const data = Array.isArray(historyData.value) ? historyData.value[0] : historyData.value
    if (data?.Positions) return data.Positions
  }
  return []
})

const computedEcoEvents = computed(() => {
  if (!ecoEventsData.value) return []
  const data = Array.isArray(ecoEventsData.value) ? ecoEventsData.value : ecoEventsData.value
  return Array.isArray(data) ? data : []
})

const totalEcoEvents = computed(() => computedEcoEvents.value.length)

const mapboxGhostPositions = ref<any[]>([])

function decodePolyline(str: string, precision: number = 5) {
    let index = 0, lat = 0, lng = 0, coordinates = [], shift = 0, result = 0, byte = null, lat_change, lng_change, factor = Math.pow(10, precision);
    while (index < str.length) {
        byte = null; shift = 0; result = 0;
        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        lat_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
        shift = result = 0;
        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        lng_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += lat_change; lng += lng_change;
        coordinates.push([lat / factor, lng / factor]);
    }
    return coordinates;
}

async function fetchGhostRoute() {
  if (!mapTripFrom.value || !mapTripTo.value || !hasMapToken.value) return
  const trip = trips.value.find(t => t.StartTime === mapTripFrom.value)
  if (!trip || !trip.StartLatitude || !trip.FinishLatitude) return
  
  const startLn = trip.StartLongitude; const startLt = trip.StartLatitude;
  const endLn = trip.FinishLongitude; const endLt = trip.FinishLatitude;
  
  const token = import.meta.env.VITE_MAPBOX_TOKEN
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLn},${startLt};${endLn},${endLt}?access_token=${token}&geometries=polyline&overview=full`
  
  try {
    const res = await fetch(url)
    const json = await res.json()
    if (json.routes && json.routes.length > 0) {
      const route = json.routes[0]
      const coords = decodePolyline(route.geometry, 5)
      const syn = coords.map(c => ({ Lat: c[0].toString(), Lng: c[1].toString() }))
      mapboxGhostPositions.value = syn
    } else {
      mapboxGhostPositions.value = []
    }
  } catch(e) { console.error('Mapbox directions error', e); mapboxGhostPositions.value = [] }
}

watch(selectedTripId, () => {
    fetchGhostRoute()
    if (activeTab.value === 'ai') {
        fetchAiSummary()
    }
})

const mapCenter = computed<[number, number]>(() => {
  const pos = vehicleData.value?.LastPosition
  if (pos) return [parseFloat(pos.Longitude), parseFloat(pos.Latitude)]
  return [14.4378, 50.0755]
})

function getScoreClass(score: number) {
  if (score >= 80) return 'score-badge--green'
  if (score >= 60) return 'score-badge--yellow'
  return 'score-badge--red'
}

function calculateTripScore(trip: any) {
  const speed = trip.AverageSpeed || 0
  return Math.min(100, Math.round(50 + speed * 0.3))
}

function formatDate(iso: string) {
  if (!iso) return '--'
  const d = new Date(iso)
  return d.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function selectTrip(trip: any) {
  const tripData = { ...trip, VehicleCode: vehicleCode.value }
  const tripDataString = encodeURIComponent(JSON.stringify(tripData))
  router.push({
    name: 'TripResult',
    params: { vehicleCode: vehicleCode.value, tripId: String(trip.Id) },
    query: { tripData: tripDataString }
  })
}

async function fetchData() {
  loading.value = true
  try {
    // Get vehicle
    const vehicle = await nestFetch<any>(`/vehicles/code/${vehicleCode.value}`)
    vehicleData.value = vehicle
    
    // Get trips
    const now = new Date()
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const tripsData = await nestFetch<any[]>(
      `/trips?vehicleCode=${vehicleCode.value}&from=${monthAgo.toISOString()}&to=${now.toISOString()}`
    )
    trips.value = tripsData || []
    
    // Set most recent trip for the map as default
    if (trips.value.length > 0) {
      selectedTripId.value = String(trips.value[0].Id)
    }
  } catch (e) {
    console.error('Failed to fetch data', e)
  } finally {
    loading.value = false
  }
}

async function fetchAiSummary() {
  if (!selectedTrip.value) return
  aiLoading.value = true
  aiSummary.value = ''
  try {
    const result: any = await getTripEvaluationFromGpsDozor({ ...selectedTrip.value, VehicleCode: vehicleCode.value })
    if (result?.evaluation?.feedback) {
      aiSummary.value = result.evaluation.feedback
    } else if (result?.feedback) {
      aiSummary.value = result.feedback
    } else {
      aiSummary.value = 'Failed to extract feedback from response.'
    }
  } catch (e) {
    aiSummary.value = 'Failed to generate AI summary'
    console.error('AI Summary Error:', e)
  } finally {
    aiLoading.value = false
  }
}

onMounted(async () => {
  await fetchData()
  if (activeTab.value === 'ai') {
    fetchAiSummary()
  }
})
</script>

<style scoped>
@reference "@/styles/base.css";
.score-badge {
  @apply px-3 py-1 rounded text-sm font-bold font-mono;
}

.score-badge--lg {
  @apply px-4 py-2 text-xl;
}

.score-badge--green {
  @apply bg-volt text-void;
}

.score-badge--yellow {
  @apply bg-warning text-void;
}

.score-badge--red {
  @apply bg-danger text-white;
}

.trip-card {
  @apply transition-all;
}

.trip-card:active {
  @apply bg-panel-hover;
}
</style>
