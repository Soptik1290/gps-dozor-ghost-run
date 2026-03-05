<template>
  <div class="ghostrun-view relative w-full h-dvh overflow-hidden bg-void">
    <!-- ── Map ── -->
    <MapContainer
      :reality-positions="animatedRealityPositions"
      :ghost-positions="ghostPositions"
      :eco-events="ecoEventsData ?? []"
      :reality-current-position="currentPosition"
      :ghost-current-position="currentGhostPosition"
      :camera-follow-reality="isPlaying"
      :initial-center="mapCenter"
      :initial-zoom="13"
    />

    <!-- ── Top HUD Bar ── -->
    <header class="absolute top-0 left-0 right-0 z-20 glass-panel border-b border-panel-border
                    flex items-center justify-between pointer-events-auto"
            style="padding-top: env(safe-area-inset-top);">
      <div class="flex items-center w-full px-4 py-2">
        <button @click="router.push(auth.homeRoute)" class="text-muted hover:text-primary transition-colors p-2 -ml-2">
          <ArrowLeft :size="20" />
        </button>
        <div class="flex-1 text-center">
          <div class="heading text-sm text-primary">GHOST RUN</div>
          <div class="text-muted text-[0.5rem] font-mono uppercase tracking-wider">
            {{ vehicleCode }}
          </div>
        </div>
        <!-- Weather Widget -->
        <div
          v-if="weather"
          class="hud-badge flex-shrink-0"
          :class="`hud-badge--${weather.trackStatus.toLowerCase()}`"
        >
          <component :is="weatherIcon" :size="10" />
          <span>{{ Math.round(weather.temperature) }}°C {{ weather.trackStatus }}</span>
        </div>
        <div v-else class="hud-badge hud-badge--dry flex-shrink-0">
          <Thermometer :size="10" />
          <span>--°C</span>
        </div>
      </div>
      
      <!-- Race Engineer Banner -->
      <div class="absolute top-full left-0 right-0 z-10 w-full overflow-hidden">
        <RaceEngineer :message="activeMessage" :is-thinking="isThinking" />
      </div>
    </header>

    <!-- ── Manual AI Trigger (Floating Right) ── -->
    <div class="absolute top-[80px] right-4 z-30 pointer-events-auto">
      <button 
        @click="triggerRaceEngineer" 
        :disabled="isThinking || historyLoading"
        class="btn btn--ghost !px-3 !py-1.5 flex flex-col items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
      >
        <span class="text-[0.5rem] mb-0.5" :class="isThinking ? 'text-primary animate-pulse' : 'text-volt'">
          {{ isThinking ? 'UPLINK...' : 'AI ASSIST' }}
        </span>
        <CloudLightning v-if="weather?.trackStatus === 'STORM'" :size="14" class="text-danger" />
        <CloudRain v-else-if="weather?.trackStatus === 'WET'" :size="14" class="text-warning" />
        <Snowflake v-else-if="weather?.trackStatus === 'ICY'" :size="14" class="text-danger" />
        <div v-else class="w-1.5 h-1.5 rounded-full" :class="isThinking ? 'bg-primary' : 'bg-volt'" />
      </button>
    </div>

    <!-- ── Mission Debrief Panel (Overlay) ── -->
    <div v-if="showDebrief && !historyLoading && realityPositions.length > 2 && !isPlaying" 
         class="absolute inset-x-4 top-24 z-30 glass-panel border border-panel-border p-6 shadow-2xl backdrop-blur-md pointer-events-auto max-w-sm mx-auto">
      
      <div class="flex items-center justify-between mb-2">
        <div class="heading text-xl text-primary animate-pulse-neon">MISSION DEBRIEF</div>
        <div class="text-3xl font-bold font-mono" :class="{
          'text-volt': tier === 'S' || tier === 'A',
          'text-warning': tier === 'B' || tier === 'C',
          'text-danger': tier === 'F'
        }">
          {{ tier }}
        </div>
      </div>
      
      <div class="text-xs font-mono text-muted mb-6 tracking-widest break-words">{{ tierLabel }}</div>
      
      <!-- Stats Comparison Grid -->
      <div class="bg-black/40 border border-panel-border p-4 mb-6 relative mt-6">
        <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-panel-border text-muted text-[0.625rem] font-bold px-3 py-1 font-mono tracking-widest uppercase rounded">
          Ghost Comparison
        </div>
        
        <div class="grid grid-cols-3 gap-2 mt-2 text-center items-end">
          <div class="flex flex-col items-center">
            <span class="text-[0.625rem] text-muted font-mono mb-1">YOU</span>
            <span class="text-xl font-bold text-primary">{{ score || '?' }}<span class="text-xs font-normal text-muted">%</span></span>
            <span class="text-sm font-bold mt-2" :class="ecoIncidentCount > 0 ? 'text-warning' : 'text-volt'">{{ ecoIncidentCount }}<span class="text-[0.5rem] font-normal text-muted block">ERRORS</span></span>
          </div>
          
          <div class="flex flex-col items-center border-l border-r border-panel-border px-2">
            <span class="text-[0.5rem] text-muted font-mono mb-2">VS GHOST</span>
            <div class="text-lg font-bold" :class="timeDelta <= 0 ? 'text-volt' : 'text-warning'">
              <span v-if="timeDelta <= 0">-</span><span v-else>+</span>{{ Math.abs(Math.floor(timeDelta)) }}s
            </div>
            <span class="text-[0.5rem] text-muted font-mono mt-1">TIME GAP</span>
          </div>
          
          <div class="flex flex-col items-center">
            <span class="text-[0.625rem] text-muted font-mono mb-1">PACER</span>
            <span class="text-xl font-bold text-muted opacity-80">{{ ghostScore || '?' }}<span class="text-xs font-normal text-muted">%</span></span>
            <span class="text-sm font-bold text-muted opacity-80 mt-2">{{ ghostRank || '?' }}<span class="text-[0.5rem] font-normal text-muted block">RANK</span></span>
          </div>
        </div>
      </div>

      <!-- AI Summary -->
      <div class="bg-black/40 border-l-2 border-primary p-3 mb-6">
        <div class="text-[0.5rem] font-mono text-primary uppercase tracking-wider mb-1 flex items-center gap-1">
          RACE CONTROL:
          <span v-if="aiFeedbackLoading" class="animate-pulse">UPLINKING...</span>
        </div>
        <div class="text-xs font-mono leading-relaxed text-blue-100 italic">
          <span v-if="aiFeedback">"{{ aiFeedback }}"</span>
          <span v-else-if="!aiFeedbackLoading">"{{ aiComment }}"</span>
        </div>
      </div>
      
      <button @click="startPlayback" class="btn btn--volt w-full">
        ▶ INITIALIZE REPLAY
      </button>
    </div>

    <!-- ── Bottom HUD Panel ── -->
    <div class="absolute bottom-0 left-0 right-0 z-20 pointer-events-auto"
         style="padding-bottom: env(safe-area-inset-bottom);">
      
      <!-- Delta Widget (Floats above panel) -->
      <div class="absolute -top-[76px] left-1/2 -translate-x-1/2 w-48 shadow-lg shadow-black/50 z-30">
        <DeltaWidget
          class="glass-panel"
          :delta="timeDelta"
          :progress="progressPercent"
          show-progress
          size="lg"
        />
      </div>

      <div class="glass-panel border-t border-panel-border pt-4 relative z-20">
        <!-- Speed & Distance -->
        <div class="grid grid-cols-2 gap-0 px-4 py-3 border-b border-surface">
          <div class="data-label text-center">
            <span class="data-label__key">CURRENT SPD</span>
            <span class="data-label__value text-3xl text-primary font-bold">
              {{ Math.round(currentSpeed) }}
              <span class="text-xs text-muted font-normal">km/h</span>
            </span>
          </div>

          <div class="data-label text-center">
            <span class="data-label__key">DISTANCE</span>
            <span class="data-label__value text-3xl text-primary font-bold">
              {{ (totalRouteLength / 1000).toFixed(1) }}
              <span class="text-xs text-muted font-normal">km</span>
            </span>
          </div>
        </div>

        <!-- Playback Controls (Dev/Demo) -->
        <div class="flex items-center gap-3 px-4 py-3 justify-center">
          <button @click="togglePlayback" class="btn btn--ghost !px-3 !py-1 text-xs w-16">
            {{ isPlaying ? '⏸ PAUSE' : '▶ PLAY' }}
          </button>
          
          <div class="w-full flex-1 max-w-[200px] flex items-center gap-2">
            <div class="h-1 flex-1 bg-surface relative rounded-full overflow-hidden">
               <div class="absolute inset-y-0 left-0 bg-primary transition-all duration-300" :style="{ width: progressPercent + '%' }"></div>
            </div>
            <span class="text-[0.625rem] text-muted font-mono w-6 text-right">{{ Math.round(progressPercent) }}%</span>
          </div>

          <button @click="playbackSpeed = playbackSpeed === 1 ? 10 : (playbackSpeed === 10 ? 50 : 1)" class="btn btn--ghost !px-2 !py-1 text-[0.625rem] w-10 text-center">
            {{ playbackSpeed }}x
          </button>

          <button @click="skipToEnd" class="btn btn--ghost !px-2 !py-1 text-[0.625rem] opacity-50 hover:opacity-100">
            ⏭
          </button>
        </div>
      </div>
    </div>

    <!-- ── Ghost/Reality Legend ── -->
    <div class="absolute top-[160px] right-3 z-10 glass-panel p-2 space-y-1.5 pointer-events-none">
      <div class="flex items-center gap-2 text-[0.5625rem] font-mono">
        <div class="w-2 h-2 rounded-full border border-black bg-[#CCFF00]" />
        <span class="text-muted">GHOST</span>
      </div>
      <div class="flex items-center gap-2 text-[0.5625rem] font-mono">
        <div class="w-2 h-2 rounded-full border border-white bg-[#0033FF]" />
        <span class="text-muted">REALITY</span>
      </div>
    </div>

    <!-- ── No Map Token Warning ── -->
    <div v-if="!hasMapToken" class="absolute inset-0 z-30 bg-void/90 flex items-center justify-center">
      <div class="text-center glass-panel p-6 max-w-xs">
        <div class="heading text-lg text-danger mb-2">MAP OFFLINE</div>
        <div class="text-muted text-xs font-mono leading-relaxed">
          Mapbox token not configured.<br />
          Set <span class="text-volt">VITE_MAPBOX_TOKEN</span> in your <span class="text-primary">.env</span> file.
        </div>
      </div>
    </div>

    <!-- ── Loading Overlay ── -->
    <div v-if="historyLoading" class="absolute inset-0 z-40 bg-void/80 flex items-center justify-center backdrop-blur-sm">
      <div class="text-center">
        <div class="text-volt text-sm font-mono animate-pulse-neon mb-2">
          LOADING TELEMETRY...
        </div>
        <div class="text-muted text-[0.625rem] font-mono">
          BUILDING GHOST TRAIL
        </div>
      </div>
    </div>

    <!-- ── No Trip Selected ── -->
    <div v-if="!tripFrom && !destLat && hasMapToken && !historyLoading"
         class="absolute inset-0 z-40 bg-void/80 flex items-center justify-center backdrop-blur-sm">
      <div class="text-center p-6 flex flex-col items-center">
        <button @click="router.push(`/trips/${vehicleCode}`)" 
                class="btn btn--volt text-lg py-4 px-8 tracking-widest animate-pulse-neon shadow-lg hover:scale-105 transition-transform bg-white/5">
          SELECT TRIP TO START
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Thermometer, CloudRain, Snowflake, CloudLightning } from 'lucide-vue-next'
import MapContainer from '@/components/map/MapContainer.vue'
import DeltaWidget from '@/components/hud/DeltaWidget.vue'
import RaceEngineer from '@/components/hud/RaceEngineer.vue'
import { useVehicleHistory } from '@/api/endpoints/history'
import { useEcoDrivingEvents } from '@/api/endpoints/ecoDriving'
import { useWeather } from '@/api/endpoints/weather'
import { analyzeDriver } from '@/api/endpoints/trips'
import { nestFetch } from '@/api/client'
import { useUiStore } from '@/stores/uiStore'
import { useGhostRun } from '@/composables/useGhostRun'
import { useDriverScore } from '@/composables/useDriverScore'
import type { ApiHistoryEntry } from '@/api/types'

const route = useRoute()
const router = useRouter()
const ui = useUiStore()

import { useAuthStore } from '@/stores/authStore'
const auth = useAuthStore()

const vehicleCode = computed(() => route.params.vehicleCode as string)
const tripFrom = computed(() => (route.query.from as string) || '')
const tripTo = computed(() => (route.query.to as string) || '')

const destLat = computed(() => route.query.destLat as string)
const destLng = computed(() => route.query.destLng as string)
const ghostId = computed(() => route.query.ghostId as string)

const hasMapToken = computed(() => {
  const t = import.meta.env.VITE_MAPBOX_TOKEN
  return !!t && t !== 'pk.placeholder_paste_your_token_here'
})

// ── Ghost Data Fetch ──
const fetchedGhostPositions = ref<ApiHistoryEntry[]>([])
const ghostScore = ref(0)
const ghostRank = ref('-')

// ── Smart Navigation Reality (Mapbox) ──
const mapboxRealityPositions = ref<ApiHistoryEntry[]>([])

// ── Fetch reality history (Legacy mode if no navigation destination) ──
const { data: historyData, isLoading: historyLoadingRef } = useVehicleHistory(
  vehicleCode,
  tripFrom,
  tripTo
)

// ── Polyline Decoder Helper ──
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

// ── Synthesize GPS logs from Mapbox Directions ──
async function fetchSmartNavigationRoute() {
  if (!destLat.value || !destLng.value || !hasMapToken.value) return
  
  const startLn = 14.4378; const startLt = 50.0755; // DB Default Start
  const endLn = parseFloat(destLng.value); const endLt = parseFloat(destLat.value);
  
  const token = import.meta.env.VITE_MAPBOX_TOKEN
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLn},${startLt};${endLn},${endLt}?access_token=${token}&geometries=polyline&overview=full`
  
  try {
    const res = await fetch(url)
    const json = await res.json()
    if (json.routes && json.routes.length > 0) {
      const route = json.routes[0]
      const coords = decodePolyline(route.geometry, 5) // Mapbox uses precision 5 for driving
      
      const speedKmh = 50 // assumed speed
      const speedMs = speedKmh / 3.6
      let currentTime = new Date().getTime()
      
      const syn: ApiHistoryEntry[] = []
      // Initial point
      syn.push({
        Lat: coords[0][0].toString(), Lng: coords[0][1].toString(),
        Speed: speedKmh, Time: new Date(currentTime).toISOString()
      })
      
      // Calculate distances to synthesize timestamps
      for (let i = 1; i < coords.length; i++) {
        // basic distance in degrees * approx to meters
        const dLat = coords[i][0] - coords[i-1][0]
        const dLng = coords[i][1] - coords[i-1][1]
        const distM = Math.sqrt(dLat*dLat + dLng*dLng) * 111320
        
        const timeDeltaMs = (distM / speedMs) * 1000
        currentTime += timeDeltaMs
        
        syn.push({
          Lat: coords[i][0].toString(), Lng: coords[i][1].toString(),
          Speed: speedKmh, Time: new Date(currentTime).toISOString()
        })
      }
      mapboxRealityPositions.value = syn
    }
  } catch(e) { console.error('Mapbox Directions error', e) }
}

async function fetchGhostReplay() {
  if (!ghostId.value) return
  try {
    const json = await nestFetch<any>(`/trips/${ghostId.value}/replay`)
    if (json.positions) {
      fetchedGhostPositions.value = json.positions
      ghostScore.value = json.score || 0
      ghostRank.value = json.rank || '-'
    }
  } catch(e) { console.error('Ghost replay error', e) }
}

watch([destLat, destLng, ghostId], () => {
  fetchSmartNavigationRoute()
  fetchGhostReplay()
}, { immediate: true })

const realityPositions = computed<ApiHistoryEntry[]>(() => {
  if (mapboxRealityPositions.value.length > 0) return mapboxRealityPositions.value
  return historyData.value?.Positions ?? []
})

const ghostPositions = computed<ApiHistoryEntry[]>(() => {
  if (fetchedGhostPositions.value.length > 0) return fetchedGhostPositions.value
  
  // Demo fallback
  if (realityPositions.value.length === 0) return []
  return realityPositions.value.map((p, idx) => ({
    ...p,
    Time: new Date(new Date(p.Time).getTime() - (Math.sin(idx / 10) * 5000)).toISOString(),
  }))
})

const historyLoading = computed(() => {
  if (!hasMapToken.value) return false
  if (destLat.value) return mapboxRealityPositions.value.length === 0
  return historyLoadingRef.value
})

// ── Eco-Driving Events ──
const { data: ecoEventsData } = useEcoDrivingEvents(vehicleCode, tripFrom, tripTo)
const ecoEventsRef = computed(() => ecoEventsData.value ?? [])

// ── Weather based on first position ──
const firstPos = computed(() => realityPositions.value[0])
const weatherLat = computed(() => firstPos.value ? parseFloat(firstPos.value.Lat) : undefined)
const weatherLng = computed(() => firstPos.value ? parseFloat(firstPos.value.Lng) : undefined)
const { data: weather } = useWeather(weatherLat, weatherLng)

// Update UI store weather overlay
watch(weather, (w) => {
  if (!w) return
  if (w.trackStatus === 'WET') ui.setWeatherOverlay('rain')
  else if (w.trackStatus === 'ICY') ui.setWeatherOverlay('ice')
  else if (w.trackStatus === 'STORM') ui.setWeatherOverlay('storm')
  else ui.setWeatherOverlay('none')
})

// ── Weather icon ──
const weatherIcon = computed(() => {
  if (!weather.value) return Thermometer
  switch (weather.value.trackStatus) {
    case 'WET': return CloudRain
    case 'ICY': return Snowflake
    case 'STORM': return CloudLightning
    default: return Thermometer
  }
})

// ── Gamification Engine (useGhostRun) ──
const {
  currentIndex,
  currentPosition,
  currentGhostPosition,
  currentSpeed,
  timeDelta,
  progressPercent,
  totalRouteLength,
  activeMessage,
  isThinking,
  isPlaying,
  playbackSpeed,
  triggerRaceEngineer,
  startPlayback,
  togglePlayback,
  skipToEnd
} = useGhostRun(realityPositions, ghostPositions, weather, ecoEventsRef)

// ── Driver Scoring Engine ──
const { score, tier, tierLabel, aiComment, ecoIncidentCount } = useDriverScore(timeDelta, ecoEventsRef)

const showDebrief = ref(true)
const aiFeedback = ref('')
const aiFeedbackLoading = ref(false)

async function fetchAiDebrief() {
  if (!ghostId.value) return
  aiFeedbackLoading.value = true
  try {
    const data = await analyzeDriver(ghostId.value) as { feedback?: string }
    if (data && data.feedback) {
      aiFeedback.value = data.feedback
    }
  } catch (e) {
    console.error('Failed to fetch AI debrief', e)
  } finally {
    aiFeedbackLoading.value = false
  }
}

watch(isPlaying, (playing) => {
  if (playing) showDebrief.value = false
})

watch(progressPercent, (pct) => {
  if (pct >= 100 && realityPositions.value.length > 2) {
    showDebrief.value = true
    if (!aiFeedback.value) fetchAiDebrief()
  }
})

// Initial load check if we start at 100% or just showing debrief
watch([showDebrief, ghostId], ([showing, gId]) => {
  if (showing && gId && !aiFeedback.value && !aiFeedbackLoading.value) {
    fetchAiDebrief()
  }
}, { immediate: true })

// Sliced trail for animation playback
const animatedRealityPositions = computed(() => {
  return realityPositions.value.slice(0, currentIndex.value + 1)
})

// ── Map Center ──
const mapCenter = computed<[number, number]>(() => {
  if (currentPosition.value) {
    return [parseFloat(currentPosition.value.Lng), parseFloat(currentPosition.value.Lat)]
  }
  if (realityPositions.value.length > 0) {
    const mid = realityPositions.value[Math.floor(realityPositions.value.length / 2)]
    return [parseFloat(mid.Lng), parseFloat(mid.Lat)]
  }
  return [14.42, 50.08]
})
</script>
