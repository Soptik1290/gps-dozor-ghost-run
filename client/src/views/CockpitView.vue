<template>
  <div class="cockpit-view min-h-dvh pb-20 bg-void">
    <!-- ── Header ── -->
    <header class="glass-panel border-b border-panel-border px-4 py-3">
      <div class="text-muted text-[0.5625rem] uppercase tracking-[0.2em] font-mono">
        PILOT UPLINK
      </div>
      <h1 class="heading text-lg text-primary">
        {{ auth.username.toUpperCase() }}
      </h1>
      <div class="flex items-center gap-2 mt-1">
        <span class="inline-block w-2 h-2 bg-volt animate-glow-pulse" />
        <span class="text-muted text-[0.625rem] font-mono">SYSTEM LINKED</span>
      </div>
    </header>

    <!-- ── Vehicle Status Card ── -->
    <div class="mx-4 mt-4 border border-panel-border bg-panel-hover p-4">
      <div class="text-volt text-[0.625rem] font-mono tracking-widest mb-3">ASSIGNED UNIT</div>
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 border border-volt/30 bg-volt-dim flex items-center justify-center">
          <Car :size="24" class="text-volt" />
        </div>
        <div class="flex-1">
          <div class="heading text-base text-primary">
            {{ auth.assignedVehicle?.name || 'NO VEHICLE' }}
          </div>
          <div class="text-muted text-xs font-mono mt-0.5">
            {{ auth.assignedVehicle?.plate || '---' }}
          </div>
        </div>
        <div class="text-right">
          <span class="inline-block w-2 h-2 bg-volt animate-glow-pulse" />
          <span class="text-volt text-[0.5625rem] font-mono ml-1">ACTIVE</span>
        </div>
      </div>
    </div>

    <!-- ── Today's Efficiency ── -->
    <div class="mx-4 mt-3 border border-panel-border bg-panel-hover p-5 relative overflow-hidden group">
      <!-- Background Grid Decoration -->
      <div class="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style="background-image: radial-gradient(var(--color-volt) 1px, transparent 1px); background-size: 16px 16px;"></div>
      
      <div class="text-volt text-[0.625rem] font-mono tracking-[0.2em] mb-4 flex justify-between relative z-10">
        <span>TODAY'S EFFICIENCY</span>
        <span class="opacity-50 animate-pulse">LINK STATUS: OPTIMAL</span>
      </div>
      
      <div class="flex items-center gap-8 relative z-10">
        <!-- SVG Gauge -->
        <div class="relative w-24 h-24 flex-shrink-0">
           <svg class="w-full h-full -rotate-90 filter drop-shadow-[0_0_8px_rgba(var(--color-volt-rgb),0.3)]" viewBox="0 0 100 100">
              <!-- Background track -->
              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" stroke-width="6" class="text-panel-border" />
              <!-- Progress track -->
              <circle cx="50" cy="50" r="42" fill="none" 
                :stroke="rankColorHex" 
                stroke-width="7" 
                stroke-dasharray="264" 
                :stroke-dashoffset="264 - (264 * Math.min(todayProgress, 100) / 100)"
                stroke-linecap="round"
                class="transition-all duration-[1500ms] ease-out"
              />
           </svg>
           <div class="absolute inset-0 flex flex-col items-center justify-center">
              <div class="text-[0.5rem] font-mono text-muted mb-[-2px]">RANK</div>
              <div class="heading text-3xl transition-all duration-500" :class="rankColor">
                {{ todayRank }}
              </div>
           </div>
        </div>

        <div class="flex-1 grid grid-cols-1 gap-4">
          <div class="relative">
            <div class="flex justify-between items-end mb-1">
              <div class="text-muted text-[0.5625rem] font-mono uppercase tracking-wider">Top Sector Score</div>
              <div class="heading text-2xl text-primary tabular-nums">{{ animatedScore }}<span class="text-xs text-muted ml-0.5">pts</span></div>
            </div>
            <div class="h-1 bg-void relative overflow-hidden">
              <div class="absolute inset-y-0 left-0 bg-volt/30 transition-all duration-1000" :style="{ width: todayProgress + '%' }"></div>
              <div class="absolute inset-y-0 left-0 bg-volt animate-scanline-fast" :style="{ width: '2px', left: todayProgress + '%' }"></div>
            </div>
          </div>
          
          <div class="flex justify-between items-center pt-1 border-t border-panel-border/30">
            <div class="text-muted text-[0.5625rem] font-mono uppercase">Completed Missions</div>
            <div class="heading text-lg text-primary">{{ todayTrips.length }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Ghost Nav CTA ── -->
    <div class="mx-4 mt-6">
      <button
        @click="initiateGhostNav"
        class="w-full py-6 border border-volt/50 bg-volt-dim/20 text-volt heading text-lg tracking-[0.25em]
               hover:bg-volt-dim/40 hover:border-volt transition-all duration-500
               active:scale-[0.98] relative overflow-hidden group shadow-[0_0_20px_rgba(var(--color-volt-rgb),0.1)]"
      >
        <!-- Animated border flare -->
        <div class="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-volt to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700"></div>
        <div class="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-volt to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700"></div>
        
        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-volt/[0.05] to-transparent
                    translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        
        <span class="relative z-10 flex items-center justify-center gap-4">
          <div class="relative">
            <Crosshair :size="20" class="group-hover:rotate-90 transition-transform duration-500" />
            <div class="absolute inset-0 bg-volt blur-sm opacity-0 group-hover:opacity-40 transition-opacity"></div>
          </div>
          INITIATE GHOST NAV
        </span>
      </button>
    </div>

    <!-- ── Recent Logs ── -->
    <div class="mt-8 px-4">
      <div class="text-volt text-[0.625rem] font-mono tracking-[0.2em] mb-4 flex items-center gap-2">
        <span class="w-1 h-3 bg-volt"></span>
        MISSION COMMAND LOGS
      </div>

      <div v-if="isLoadingTrips" class="py-12 text-center border border-panel-border/30 bg-panel-hover/20">
        <div class="relative inline-block">
          <div class="text-volt text-sm font-mono animate-pulse tracking-[0.3em]">DECRYPTING...</div>
          <div class="absolute -bottom-1 inset-x-0 h-[1px] bg-volt/30 animate-scanline"></div>
        </div>
      </div>

      <div v-else-if="recentTrips.length === 0" class="py-12 text-center border border-panel-border/30 bg-panel-hover/20">
        <div class="text-muted text-xs font-mono tracking-widest">NO TELEMETRY DETECTED</div>
      </div>

      <div
        v-for="trip in recentTrips"
        :key="trip.id"
        class="glass-panel glass-panel--hover border-b border-panel-border
               px-4 py-4 cursor-pointer active:bg-panel-hover transition-all mb-2 group relative overflow-hidden"
        @click="openTrip(trip)"
      >
        <div class="absolute left-0 top-0 bottom-0 w-0.5 bg-volt opacity-0 group-hover:opacity-100 transition-opacity"></div>
        
        <div class="flex items-center justify-between mb-2">
          <div class="text-[0.625rem] font-mono text-volt font-bold tracking-wider">
            SEC: {{ formatTime(trip.startTime) }} <span class="text-muted opacity-50 px-1">//</span> {{ formatTime(trip.endTime) }}
          </div>
          <div class="text-[0.625rem] font-mono px-2 py-0.5 border border-current" :class="getRankColor(trip.rank)">
            RANK {{ trip.rank }}
          </div>
        </div>
        <div class="flex items-center gap-5 text-[0.5625rem] font-mono text-muted uppercase tracking-wider">
          <div class="flex items-center gap-1.5 font-bold text-primary">
            <span class="opacity-40 font-normal">DIST:</span> {{ trip.distanceKm?.toFixed(1) }} KM
          </div>
          <div class="flex items-center gap-1.5">
            <span class="opacity-40">SPD:</span> {{ trip.avgSpeed?.toFixed(0) }} KM/H
          </div>
          <div class="flex items-center gap-1.5 ml-auto opacity-60">
            {{ formatDate(trip.startTime) }}
          </div>
        </div>
      </div>
    </div>

    <!-- ── Ghost Nav Modal ── -->
    <div v-if="showNavModal" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-void/90 backdrop-blur-md" @click="showNavModal = false" />
      <div class="relative bg-void border border-panel-border p-8 w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div class="absolute -top-3 left-6 bg-volt text-void text-[0.625rem] font-bold px-4 py-1.5 font-mono tracking-[0.25em] uppercase shadow-lg">
          MISSION SELECT
        </div>
        
        <div class="text-muted text-[0.5rem] font-mono mb-6 tracking-widest uppercase opacity-50">Choose target coordinates for pacer match</div>
        
        <div class="grid grid-cols-1 gap-3">
          <button
            v-for="dest in destinations"
            :key="dest.key"
            @click="matchDestination(dest)"
            class="group relative flex items-center gap-4 p-4 border border-panel-border/50 hover:border-volt/50
                   transition-all bg-panel-hover/20 hover:bg-panel-hover/40 text-left overflow-hidden"
          >
            <!-- Scanline effect -->
            <div class="absolute inset-0 bg-gradient-to-b from-transparent via-volt/[0.03] to-transparent -translate-y-full group-hover:animate-scanline pointer-events-none" />
            
            <div class="w-10 h-10 border border-panel-border flex items-center justify-center group-hover:border-volt/30 transition-colors">
              <Crosshair :size="18" class="text-volt opacity-50 group-hover:opacity-100 transition-all group-hover:rotate-90" />
            </div>
            
            <div class="flex-1">
              <div class="text-primary text-xs font-mono font-bold tracking-wider mb-0.5 group-hover:text-volt transition-colors">
                {{ dest.label.toUpperCase() }}
              </div>
              <div class="text-[0.5625rem] text-muted font-mono flex items-center gap-3 opacity-60">
                <span>INTEL: {{ dest.pacerRank }} PACER</span>
                <span class="w-1 h-1 bg-muted rounded-full"></span>
                <span>{{ dest.dist }} KM</span>
              </div>
            </div>
            
            <ChevronRight :size="16" class="text-muted group-hover:text-volt group-hover:translate-x-1 transition-all" />
          </button>
        </div>
        
        <button @click="showNavModal = false" 
                class="w-full mt-8 py-3 bg-panel-hover/30 border border-panel-border text-muted text-[0.625rem] font-mono tracking-widest hover:text-primary transition-colors">
          ABORT SELECTION
        </button>
      </div>
    </div>

    <!-- ── Match Result Modal ── -->
    <div v-if="showMatchModal" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-void/80 backdrop-blur-sm" @click="showMatchModal = false" />
      <div class="relative bg-panel-hover border border-volt p-6 w-full max-w-sm shadow-2xl">
        <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-volt text-void text-[0.625rem] font-bold px-3 py-1 font-mono tracking-widest uppercase">
          Ghost Found
        </div>
        <h2 class="text-xl heading text-primary text-center mb-1 mt-2">
          CHALLENGE {{ matchedGhost?.rank }}
        </h2>
        <div class="text-center font-mono text-xs text-volt uppercase tracking-widest">
          PACER: {{ matchedGhost?.driver?.username || 'UNKNOWN' }}
        </div>
        <div class="flex gap-3 mt-8">
          <button @click="showMatchModal = false" class="btn btn--outline flex-1 py-4">DECLINE</button>
          <button @click="acceptChallenge" class="btn btn--solid flex-1 py-4 bg-volt text-void hover:bg-volt-bright">
            ACCEPT
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Car, Crosshair } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/authStore'
import { nestFetch } from '@/api/client'
import { matchGhostTrip } from '@/api/endpoints/trips'

const router = useRouter()
const auth = useAuthStore()

// ── Trip data ──
const allTrips = ref<any[]>([])
const isLoadingTrips = ref(true)

const todayTrips = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return allTrips.value.filter(t => t.startTime?.slice(0, 10) === today)
})

const todayScore = computed(() => {
  if (todayTrips.value.length === 0) return 0
  return Math.max(...todayTrips.value.map(t => t.score || 0))
})

const todayRank = computed(() => {
  const s = todayScore.value
  if (s >= 90) return 'S'
  if (s >= 80) return 'A'
  if (s >= 65) return 'B'
  if (s >= 50) return 'C'
  return 'F'
})

const rankColor = computed(() => {
  const r = todayRank.value
  if (r === 'S') return 'text-volt'
  if (r === 'A') return 'text-emerald-400'
  if (r === 'B') return 'text-sky-400'
  if (r === 'C') return 'text-amber-400'
  return 'text-danger'
})

const recentTrips = computed(() => allTrips.value.slice(0, 8))

// ── Animations & Gauges ──
const todayProgress = ref(0)
const animatedScore = ref(0)

const rankColorHex = computed(() => {
  const r = todayRank.value
  if (r === 'S') return '#CCFF00' // Volt
  if (r === 'A') return '#34d399' // Emerald
  if (r === 'B') return '#38bdf8' // Sky
  if (r === 'C') return '#fbbf24' // Amber
  return '#ef4444' // Danger
})

// Rolling score animation
watch(todayScore, (newVal: number) => {
  const start = animatedScore.value
  const duration = 1500
  const startTime = performance.now()
  
  const animate = (time: number) => {
    const elapsed = time - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    // Easing out quadratic
    const easeProgress = progress * (2 - progress)
    
    animatedScore.value = Math.floor(start + (newVal - start) * easeProgress)
    todayProgress.value = Math.floor(newVal * easeProgress)
    
    if (progress < 1) {
      requestAnimationFrame(animate)
    } else {
      todayProgress.value = newVal
    }
  }
  requestAnimationFrame(animate)
}, { immediate: true })

// ── Ghost Nav ──
const showNavModal = ref(false)
const showMatchModal = ref(false)
const matchedGhost = ref<any>(null)
const selectedDest = ref<any>(null)

const destinations = [
  { key: 'warehouse', label: 'Prague Warehouse', lat: 50.0811, lng: 14.4428, pacerRank: 'S', dist: 4.2 },
  { key: 'client', label: 'Client Region Alpha', lat: 50.0401, lng: 14.4021, pacerRank: 'A', dist: 8.7 },
  { key: 'depot', label: 'Central Depot', lat: 50.1023, lng: 14.4501, pacerRank: 'B', dist: 3.1 },
]

const CURRENT_LOC = { lat: 50.0755, lng: 14.4378 }

function initiateGhostNav() {
  showNavModal.value = true
}

async function matchDestination(dest: any) {
  showNavModal.value = false
  selectedDest.value = dest
  try {
    const ghost = await matchGhostTrip(CURRENT_LOC.lat, CURRENT_LOC.lng, dest.lat, dest.lng)
    if (ghost) {
      matchedGhost.value = ghost
      showMatchModal.value = true
    } else {
      // No ghost, go pacemaker
      const vPlate = auth.assignedVehicle?.plate || 'PACER'
      router.push({ path: `/ghost-run/${vPlate}`, query: { destLat: dest.lat, destLng: dest.lng } })
    }
  } catch {
    const vPlate = auth.assignedVehicle?.plate || 'STATIC'
    router.push({ path: `/ghost-run/${vPlate}`, query: { destLat: dest.lat, destLng: dest.lng } })
  }
}

function acceptChallenge() {
  showMatchModal.value = false
  const dest = selectedDest.value
  const vPlate = auth.assignedVehicle?.plate || 'CHALLENGER'
  router.push({
    path: `/ghost-run/${vPlate}`,
    query: { ghostId: matchedGhost.value.id, destLat: dest.lat, destLng: dest.lng }
  })
}

function openTrip(_trip: any) {
  const vPlate = auth.assignedVehicle?.plate || '_'
  router.push(`/trips/${vPlate}`)
}

// ── Helpers ──
function formatTime(iso: string) {
  if (!iso) return '--'
  const d = new Date(iso)
  return d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  if (!iso) return '--'
  return new Date(iso).toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' })
}

function getRankColor(rank: string) {
  if (rank === 'S') return 'text-volt'
  if (rank === 'A') return 'text-emerald-400'
  if (rank === 'B') return 'text-sky-400'
  if (rank === 'C') return 'text-amber-400'
  return 'text-danger'
}

// ── Load driver trips ──
onMounted(async () => {
  try {
    const driverId = auth.userId
    if (driverId) {
      const trips = await nestFetch<any[]>(`/trips?driverId=${driverId}`)
      allTrips.value = trips || []
    }
  } catch (e) {
    console.error('Failed to load trips', e)
  } finally {
    isLoadingTrips.value = false
  }
})
</script>
