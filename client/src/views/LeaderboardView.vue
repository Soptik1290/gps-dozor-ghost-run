<template>
  <div class="leaderboard-view min-h-dvh pb-20 bg-void">
    <!-- Header -->
    <header class="glass-panel border-b border-panel-border px-4 py-4">
      <div class="flex items-center justify-between mb-3">
        <button @click="router.push(auth.homeRoute)" class="text-muted hover:text-primary transition-colors">
          <ArrowLeft :size="20" />
        </button>
        <h1 class="heading text-2xl text-primary font-bold tracking-tight">LEADERBOARD</h1>
        <div class="w-8"></div>
      </div>
      
      <!-- Filters -->
      <div class="flex flex-wrap gap-3 mt-4">
        <select v-model="aggregateBy" class="filter-select text-base py-4 px-6">
          <option value="vehicle" class="bg-void text-primary">Sort by Vehicle</option>
          <option value="driver" class="bg-void text-primary">Sort by Driver</option>
        </select>
        
        <select v-model="selectedGroup" class="filter-select text-base py-4 px-6">
          <option value="" class="bg-void text-primary">All Groups</option>
          <option v-for="g in groups" :key="g.Code" :value="g.Code" class="bg-void text-primary">{{ g.Name || g.Code }}</option>
        </select>
        
        <select v-model="selectedBranch" class="filter-select text-base py-4 px-6">
          <option value="" class="bg-void text-primary">All Branches</option>
          <option v-for="b in branches" :key="b" :value="b" class="bg-void text-primary">{{ b }}</option>
        </select>
        
        <select v-model="dateRange" class="filter-select text-base py-4 px-6">
          <option value="today" class="bg-void text-primary">Today</option>
          <option value="week" class="bg-void text-primary">This Week</option>
          <option value="month" class="bg-void text-primary">This Month</option>
          <option value="all" class="bg-void text-primary">All Time</option>
        </select>
        
        <select v-model="sortBy" class="filter-select text-base py-4 px-6 border-volt bg-volt-dim text-volt">
          <option value="score" class="bg-void text-volt">Rank by Score</option>
          <option value="trips" class="bg-void text-volt">Rank by Trips</option>
          <option value="distance" class="bg-void text-volt">Rank by Distance</option>
          <option value="efficiency" class="bg-void text-volt">Rank by Efficiency</option>
        </select>
      </div>
    </header>

    <!-- Weather Indicator -->
    <div v-if="weather" class="px-4 py-2 flex items-center gap-2 border-b border-panel-border">
      <component :is="weatherIcon" :size="14" :class="weatherColor" />
      <span class="text-sm font-mono font-bold" :class="weatherColor">{{ weather.description }}</span>
      <span class="text-xs text-muted font-mono ml-auto">{{ Math.round(weather.temperature) }}°C</span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20">
      <div class="w-8 h-8 border-4 border-volt/20 border-t-volt rounded-full animate-spin mb-4"></div>
      <div class="text-volt text-sm font-mono font-bold animate-pulse">CALCULATING RANKINGS...</div>
    </div>

    <!-- Leaderboard -->
    <div v-else class="p-4 space-y-3">
      <!-- Top 3 Podium -->
      <!-- Top 3 Podium -->
      <div v-if="filteredItems.length >= 3" class="grid grid-cols-3 gap-4 mb-8 pt-4">
        <!-- 2nd -->
        <div class="flex flex-col items-center justify-end pb-2">
          <div class="text-6xl mb-4">🥈</div>
          <div class="text-sm font-mono text-muted mt-1 text-center truncate w-full px-2">{{ filteredItems[1].name }}</div>
          <div class="score-badge score-badge--silver mt-2 text-lg px-4 py-1">{{ filteredItems[1].score }}</div>
        </div>
        <!-- 1st -->
        <div class="flex flex-col items-center justify-end pb-2">
          <div class="text-7xl mb-6">🏆</div>
          <div class="text-sm font-mono text-volt font-bold mt-1 text-center truncate w-full px-2">{{ filteredItems[0].name }}</div>
          <div class="score-badge score-badge--gold mt-2 text-xl px-6 py-1.5">{{ filteredItems[0].score }}</div>
        </div>
        <!-- 3rd -->
        <div class="flex flex-col items-center justify-end pb-2">
          <div class="text-5xl mb-3">🥉</div>
          <div class="text-sm font-mono text-muted mt-1 text-center truncate w-full px-2">{{ filteredItems[2].name }}</div>
          <div class="score-badge score-badge--bronze mt-2 text-lg px-4 py-1">{{ filteredItems[2].score }}</div>
        </div>
      </div>

      <!-- Rankings List -->
      <div
        v-for="(item, index) in filteredItems"
        :key="item.code"
        class="leaderboard-card glass-panel glass-panel--hover border-b border-panel-border p-5 cursor-pointer transition-all duration-150"
        :class="{ 'border-l-4 border-l-volt': index === 0 }"
        @click="selectItem(item)"
      >
        <div class="flex items-center gap-4">
          <!-- Rank -->
          <div class="rank-badge" :class="getRankClass(index + 1)">
            {{ index + 1 }}
          </div>
          
          <!-- Vehicle/Driver Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline gap-2">
              <span class="heading text-2xl text-primary font-black truncate">{{ item.name }}</span>
              <span v-if="item.driverName" class="text-xs text-muted">({{ item.driverName }})</span>
            </div>
            <div class="text-xs text-muted font-mono mt-1">
              {{ item.branchName }} • <span class="text-primary">{{ item.tripCount }}</span> trips • <span class="text-primary">{{ item.totalDistance.toFixed(0) }}</span> km
            </div>
          </div>
          
          <!-- Score -->
          <div class="score-badge text-4xl px-8 py-4" :class="getScoreClass(item.score)">
            {{ item.score }}
          </div>
        </div>
        
        <!-- Stats Bar -->
        <div class="flex items-center gap-6 mt-4 pt-4 border-t border-panel-border text-[0.6875rem] font-mono">
          <div class="flex items-center gap-2">
            <span class="text-muted">AVG SPD:</span>
            <span class="text-primary font-bold">{{ item.avgSpeed }} <span class="text-[0.625rem] font-normal text-muted">km/h</span></span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-muted">ECO INCIDENTS:</span>
            <span class="font-bold" :class="item.ecoEvents > 5 ? 'text-danger' : item.ecoEvents > 0 ? 'text-warning' : 'text-volt'">
              {{ item.ecoEvents }}
            </span>
          </div>
          <div class="flex items-center gap-2 ml-auto">
            <span class="text-muted">FUEL:</span>
            <span class="font-bold" :class="item.fuelEfficiency > 8 ? 'text-danger' : item.fuelEfficiency > 6 ? 'text-warning' : 'text-volt'">
              {{ item.fuelEfficiency.toFixed(1) }} <span class="text-[0.625rem] font-normal text-muted">L/100km</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && filteredItems.length === 0" class="py-12 text-center">
      <div class="text-muted text-sm font-mono font-bold">NO DATA AVAILABLE</div>
      <div class="text-dim text-[0.5625rem] font-mono mt-1">TRY ADJUSTING FILTERS</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, CloudRain, Snowflake, Sun, Cloud } from 'lucide-vue-next'
import { useGroups } from '@/api/endpoints/vehicles'
import { nestFetch } from '@/api/client'
import { useWeather } from '@/api/endpoints/weather'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const auth = useAuthStore()

// Filters
const aggregateBy = ref('vehicle')
const selectedGroup = ref('')
const selectedBranch = ref('')
const dateRange = ref('week')
const sortBy = ref('score')

// Data
const loading = ref(true)
const vehiclesData = ref<any[]>([])
const tripsData = ref<any[]>([])

// Groups
const { data: groups } = useGroups()

// Extract unique branches
const branches = computed(() => {
  const branchSet = new Set<string>()
  vehiclesData.value.forEach(v => {
    if (v.BranchName) branchSet.add(v.BranchName)
  })
  return Array.from(branchSet)
})

// Weather
const { data: weather } = useWeather(
  computed(() => 50.0755),
  computed(() => 14.4378)
)

const weatherIcon = computed(() => {
  if (!weather.value) return Sun
  switch (weather.value.trackStatus) {
    case 'WET': return CloudRain
    case 'ICY': return Snowflake
    case 'STORM': return Cloud
    default: return Sun
  }
})

const weatherColor = computed(() => {
  if (!weather.value) return 'text-volt'
  switch (weather.value.trackStatus) {
    case 'WET': return 'text-blue-400'
    case 'ICY': return 'text-cyan-400'
    case 'STORM': return 'text-danger'
    default: return 'text-volt'
  }
})

// Get date range
function getDateRange() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (dateRange.value) {
    case 'today':
      return { from: today.toISOString(), to: now.toISOString() }
    case 'week':
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      return { from: weekAgo.toISOString(), to: now.toISOString() }
    case 'month':
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      return { from: monthAgo.toISOString(), to: now.toISOString() }
    default:
      return { from: '2020-01-01', to: now.toISOString() }
  }
}

// Fetch and aggregate data
async function fetchData() {
  loading.value = true
  try {
    // Get groups
    const groupsRes = await nestFetch<any[]>('/vehicles/groups')
    const firstGroup = groupsRes?.[0]?.Code || 'SAGU'
    
    // Get vehicles
    const vehiclesRes = await nestFetch<any[]>(`/vehicles/group/${firstGroup}`)
    vehiclesData.value = vehiclesRes || []
    
    // Get trips for all vehicles
    const { from, to } = getDateRange()
    const allTrips: any[] = []
    
    for (const v of vehiclesRes || []) {
      try {
        const trips = await nestFetch<any[]>(
          `/trips?vehicleCode=${v.Code}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
        )
        if (trips) {
          trips.forEach((t: any) => {
            allTrips.push({ ...t, vehicleCode: v.Code, vehicleName: v.Name, branchName: v.BranchName })
          })
        }
      } catch (e) {
        // Skip failed requests
      }
    }
    
    tripsData.value = allTrips
  } catch (e) {
    console.error('Failed to fetch leaderboard data', e)
  } finally {
    loading.value = false
  }
}

// Aggregate by vehicle or driver
const baseItems = computed(() => {
  const map = new Map<string, any>()
  
  tripsData.value.forEach(trip => {
    let code = trip.vehicleCode
    const vehicle = vehiclesData.value.find(v => v.Code === code)
    let name = trip.vehicleName || vehicle?.Name || code
    
    if (aggregateBy.value === 'driver') {
      if (trip.DriverName) {
         code = `driver-${trip.DriverName}`
         name = trip.DriverName
      } else {
         // Fallback if no driver name
         code = `vehicle-${trip.vehicleCode}`
         name = trip.vehicleName || code
      }
    } else {
      code = `vehicle-${trip.vehicleCode}`
      name = trip.vehicleName || code
    }
    
    if (!map.has(code)) {
      map.set(code, {
        code,
        originalCode: trip.vehicleCode,
        name,
        driverName: aggregateBy.value === 'vehicle' ? trip.DriverName || '' : '', // Only show driver if aggregating by vehicle
        branchName: trip.branchName || vehicle?.BranchName || '',
        trips: [],
        totalDistance: 0,
        totalFuel: 0,
        totalEcoEvents: 0,
        speeds: [],
      })
    }
    
    const item = map.get(code)
    item.trips.push(trip)
    item.totalDistance += trip.TotalDistance || 0
    item.totalFuel += trip.FuelConsumed?.Value || 0
    item.speeds.push(trip.AverageSpeed || 0)
    // Assume we calculate eco events from eco data, for now placeholder
  })
  
  // Calculate scores
  const items = Array.from(map.values()).map((item: any) => {
    const tripCount = item.trips.length
    
    // Filter out undefined/null speeds before reducing
    const validSpeeds = item.speeds.filter((s: number) => typeof s === 'number' && !isNaN(s))
    const avgSpeed = validSpeeds.length > 0 
      ? validSpeeds.reduce((a: number, b: number) => a + b, 0) / validSpeeds.length 
      : 0
      
    const fuelEfficiency = item.totalDistance > 0 
      ? (item.totalFuel / item.totalDistance) * 100 
      : 0
    
    // Calculate score
    let score = 50 // base
    score += Math.min(30, (avgSpeed || 0) * 0.3) // speed bonus
    score -= Math.min(20, (item.totalEcoEvents || 0) * 2) // eco penalty
    
    // Gamification metrics: Weather adjustments
    if (weather.value?.trackStatus === 'WET') score *= 0.95
    if (weather.value?.trackStatus === 'ICY') score *= 0.85
    if (weather.value?.trackStatus === 'STORM') score *= 0.75
    
    score = Math.max(0, Math.min(100, Math.round(score)))
    
    return {
      ...item,
      tripCount,
      avgSpeed: Math.round(avgSpeed),
      fuelEfficiency,
      score,
      ecoEvents: item.totalEcoEvents,
    }
  })
  
  // Sort
  switch (sortBy.value) {
    case 'trips':
      items.sort((a: any, b: any) => b.tripCount - a.tripCount)
      break
    case 'distance':
      items.sort((a: any, b: any) => b.totalDistance - a.totalDistance)
      break
    case 'efficiency':
      items.sort((a: any, b: any) => a.fuelEfficiency - b.fuelEfficiency)
      break
    default:
      items.sort((a: any, b: any) => b.score - a.score)
  }
  
  return items
})

// Filter by branch
const filteredItems = computed(() => {
  let items = baseItems.value
  if (selectedBranch.value) {
    items = items.filter(i => i.branchName === selectedBranch.value)
  }
  // Group filtering logic would also go here if needed, right now we just have selectedBranch
  return items
})

function getRankClass(rank: number) {
  if (rank === 1) return 'rank-1'
  if (rank === 2) return 'rank-2'
  if (rank === 3) return 'rank-3'
  return ''
}

function getScoreClass(score: number) {
  if (score >= 80) return 'score-badge--green'
  if (score >= 60) return 'score-badge--yellow'
  return 'score-badge--red'
}

function selectItem(item: any) {
  // Always use originalCode defined by the vehicle code for the router,
  // since the detail view depends on vehicleCode. We could send driver name as query too.
  router.push({
    path: `/leaderboard/${item.originalCode}`,
    query: {
      type: aggregateBy.value,
      driverName: item.driverName || item.name
    }
  })
}

onMounted(fetchData)
</script>

<style scoped>
@reference "@/styles/base.css";
.filter-select text-base py-4 px-6 {
  @apply bg-surface text-primary text-sm font-mono px-4 py-3 rounded-none border border-panel-border transition-colors cursor-pointer;
  @apply focus:outline-none focus:border-volt hover:bg-panel-hover;
}

.leaderboard-card {
  @apply transition-all;
}

.rank-badge {
  @apply w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold font-mono;
  @apply bg-surface border border-panel-border text-primary;
}

.rank-1 {
  @apply bg-volt text-void;
}

.rank-2 {
  @apply bg-gray-400 text-void;
}

.rank-3 {
  @apply bg-amber-600 text-void;
}

.score-badge {
  @apply px-3 py-1 rounded text-sm font-bold font-mono;
}

.score-badge--gold {
  @apply bg-gradient-to-r from-yellow-400 to-yellow-600 text-black;
}

.score-badge--silver {
  @apply bg-gradient-to-r from-gray-300 to-gray-500 text-black;
}

.score-badge--bronze {
  @apply bg-gradient-to-r from-amber-600 to-amber-800 text-white;
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
</style>

