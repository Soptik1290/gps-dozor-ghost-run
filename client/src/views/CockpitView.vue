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
    <div class="mx-4 mt-3 border border-panel-border bg-panel-hover p-4">
      <div class="text-volt text-[0.625rem] font-mono tracking-widest mb-3">TODAY'S EFFICIENCY</div>
      <div class="flex items-end gap-4">
        <div class="flex-1">
          <div class="heading text-4xl" :class="rankColor">
            RANK {{ todayRank }}
          </div>
          <div class="text-muted text-xs font-mono mt-1">
            {{ todayTrips.length }} MISSIONS COMPLETED
          </div>
        </div>
        <div class="text-right">
          <div class="heading text-3xl text-primary">{{ todayScore }}<span class="text-lg text-muted">pts</span></div>
          <div class="text-muted text-[0.5625rem] font-mono">BEST RUN</div>
        </div>
      </div>
    </div>

    <!-- ── Ghost Nav CTA ── -->
    <div class="mx-4 mt-4">
      <button
        @click="initiateGhostNav"
        class="w-full py-5 border-2 border-volt bg-volt-dim text-volt heading text-lg tracking-widest
               hover:bg-volt hover:text-void transition-all duration-300
               active:scale-[0.98] relative overflow-hidden group"
      >
        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-volt/10 to-transparent
                    translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        <span class="relative z-10 flex items-center justify-center gap-3">
          <Crosshair :size="22" />
          INITIATE GHOST NAV
        </span>
      </button>
    </div>

    <!-- ── Recent Logs ── -->
    <div class="mt-6 px-4">
      <div class="text-volt text-[0.625rem] font-mono tracking-widest mb-3">MY RECENT LOGS</div>

      <div v-if="isLoadingTrips" class="py-8 text-center">
        <div class="text-volt text-sm font-mono animate-pulse-neon">SCANNING LOGS...</div>
      </div>

      <div v-else-if="recentTrips.length === 0" class="py-8 text-center">
        <div class="text-muted text-xs font-mono">NO MISSION DATA FOUND</div>
      </div>

      <div
        v-for="trip in recentTrips"
        :key="trip.id"
        class="glass-panel glass-panel--hover border-b border-panel-border
               px-4 py-3 cursor-pointer active:bg-panel-hover transition-all mb-1"
        @click="openTrip(trip)"
      >
        <div class="flex items-center justify-between mb-1">
          <div class="text-xs font-mono text-volt font-bold">
            {{ formatTime(trip.startTime) }} → {{ formatTime(trip.endTime) }}
          </div>
          <div class="text-xs font-mono" :class="getRankColor(trip.rank)">
            {{ trip.rank }}
          </div>
        </div>
        <div class="flex items-center gap-4 text-[0.625rem] font-mono text-muted">
          <span>{{ trip.distanceKm?.toFixed(1) }} km</span>
          <span>{{ trip.avgSpeed?.toFixed(0) }} km/h</span>
          <span>{{ trip.score }} pts</span>
          <span class="ml-auto">{{ formatDate(trip.startTime) }}</span>
        </div>
      </div>
    </div>

    <!-- ── Ghost Nav Modal ── -->
    <div v-if="showNavModal" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-void/80 backdrop-blur-sm" @click="showNavModal = false" />
      <div class="relative bg-panel-hover border border-volt p-6 w-full max-w-md shadow-2xl">
        <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-volt text-void text-[0.625rem] font-bold px-3 py-1 font-mono tracking-widest uppercase">
          Select Destination
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <button
            v-for="dest in destinations"
            :key="dest.key"
            @click="matchDestination(dest)"
            class="flex flex-col items-center justify-center p-4 border border-panel-border hover:border-volt
                   text-primary text-xs font-mono transition-colors bg-void hover:bg-panel-hover text-center"
          >
            <span class="text-volt mb-2"><Crosshair :size="20"/></span>
            {{ dest.label }}
          </button>
        </div>
        <button @click="showNavModal = false" class="btn btn--ghost w-full mt-6 text-xs">CANCEL</button>
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
import { ref, computed, onMounted } from 'vue'
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

// ── Ghost Nav ──
const showNavModal = ref(false)
const showMatchModal = ref(false)
const matchedGhost = ref<any>(null)
const selectedDest = ref<any>(null)

const destinations = [
  { key: 'warehouse', label: 'Prague Warehouse (Ghost Route)', lat: 50.0811, lng: 14.4428 },
  { key: 'client', label: 'Client Region', lat: 50.0401, lng: 14.4021 },
  { key: 'depot', label: 'Depot', lat: 50.1023, lng: 14.4501 },
]

const CURRENT_LOC = { lat: 50.0755, lng: 14.4378 }

function initiateGhostNav() {
  showNavModal.value = true
}

async function matchDestination(dest: { key: string; label: string; lat: number; lng: number }) {
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
