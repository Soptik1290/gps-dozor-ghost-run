<template>
  <div class="ghostrun-view relative w-full h-dvh overflow-hidden bg-void text-primary">
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

    <!-- ── Live Efficiency Hub (Left) ── -->
    <div class="absolute left-6 top-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center gap-3">
      <div class="text-[0.5rem] font-mono text-volt uppercase tracking-[0.4em] [writing-mode:vertical-lr] rotate-180 py-2 font-bold opacity-80">CHASSIS EFFICIENCY</div>
      <div class="w-1.5 h-64 bg-void/40 border border-panel-border/30 relative overflow-hidden flex flex-col-reverse backdrop-blur-sm shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        <div class="absolute inset-0 opacity-20" style="background: repeating-linear-gradient(0deg, transparent, transparent 7px, var(--color-panel-border) 7px, var(--color-panel-border) 8px);"></div>
        <div 
          class="w-full transition-all duration-700 ease-out" 
          :style="{ height: (score || 0) + '%', backgroundColor: tierColorHex, boxShadow: `0 0 15px ${tierColorHex}80` }"
        ></div>
        <!-- Stability Markers -->
        <div class="absolute top-[40%] left-0 right-0 h-[1px] bg-red-500/30"></div>
        <div class="absolute top-[20%] left-0 right-0 h-[1px] bg-yellow-500/30"></div>
      </div>
      <div class="flex flex-col items-center bg-void/60 px-2 py-1 border border-panel-border/20 backdrop-blur-sm">
        <div class="heading text-sm transition-colors duration-500" :style="{ color: tierColorHex }">{{ score }}%</div>
        <div class="text-[0.45rem] font-mono text-muted tracking-widest uppercase">Stability</div>
      </div>
    </div>

    <!-- ── Proximity Alert ── -->
    <Transition name="fade-fast">
      <div v-if="Math.abs(timeDelta) < 3 && isPlaying" 
           class="absolute top-32 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
         <div class="px-6 py-2 bg-volt text-void heading text-[0.625rem] tracking-[0.4em] shadow-[0_0_30px_rgba(var(--color-volt-rgb),0.5)] flex items-center gap-4 border border-white/20">
           <div class="w-1.5 h-1.5 bg-void animate-ping rounded-full"></div>
           {{ timeDelta < 0 ? 'TARGET LEAD MAINTAINED' : 'GHOST PROXIMITY CRITICAL' }}
           <div class="w-1.5 h-1.5 bg-void animate-ping rounded-full"></div>
         </div>
      </div>
    </Transition>

    <!-- ── Top HUD Bar ── -->
    <header class="absolute top-0 left-0 right-0 z-20 glass-panel border-b border-panel-border
                    flex items-center justify-between pointer-events-auto shadow-[0_5px_15px_rgba(0,0,0,0.3)]"
            style="padding-top: env(safe-area-inset-top);">
      <div class="flex items-center w-full px-4 py-2">
        <button @click="router.push(auth.homeRoute)" class="text-muted hover:text-primary transition-colors p-2 -ml-2">
          <ArrowLeft :size="20" />
        </button>
        <div class="flex-1 text-center">
          <div class="heading text-sm text-primary tracking-[0.15em]">GHOST RUN REPLAY</div>
          <div class="text-muted text-[0.5rem] font-mono uppercase tracking-[0.2em] opacity-60">
            TELEMETRY: {{ vehicleCode }}
          </div>
        </div>
        <!-- Weather Widget -->
        <div
          v-if="weather"
          class="hud-badge flex-shrink-0 border border-panel-border/30 bg-black/40"
          :class="`hud-badge--${weather.trackStatus.toLowerCase()}`"
        >
          <component :is="weatherIcon" :size="10" />
          <span class="font-mono">{{ Math.round(weather.temperature) }}°C {{ weather.trackStatus }}</span>
        </div>
        <div v-else class="hud-badge hud-badge--dry flex-shrink-0 opacity-40">
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
    <div class="absolute top-[90px] right-4 z-30 pointer-events-auto">
      <button 
        @click="triggerRaceEngineer" 
        :disabled="isThinking || historyLoading"
        class="border border-panel-border/30 bg-void/60 backdrop-blur-md px-3 py-2 flex flex-col items-center gap-1 opacity-80 hover:opacity-100 hover:border-volt/50 transition-all group active:scale-95"
      >
        <span class="text-[0.45rem] tracking-[0.2em] font-mono mb-0.5" :class="isThinking ? 'text-primary animate-pulse' : 'text-volt'">
          {{ isThinking ? 'UPLINKING...' : 'AI ASSIST' }}
        </span>
        <CloudLightning v-if="weather?.trackStatus === 'STORM'" :size="14" class="text-danger" />
        <CloudRain v-else-if="weather?.trackStatus === 'WET'" :size="14" class="text-warning" />
        <Snowflake v-else-if="weather?.trackStatus === 'ICY'" :size="14" class="text-danger" />
        <div v-else class="w-1.5 h-1.5 rounded-full transition-all group-hover:scale-125 group-hover:shadow-[0_0_8px_currentColor]" :class="isThinking ? 'bg-primary' : 'bg-volt'" />
      </button>
    </div>

    <!-- ── Mission Debrief Panel (Overlay) ── -->
    <div v-if="showDebrief && !historyLoading && realityPositions.length > 2 && !isPlaying" 
         class="absolute inset-x-4 top-28 z-40 glass-panel border border-panel-border p-6 shadow-[0_0_50px_rgba(0,0,0,0.6)] backdrop-blur-xl pointer-events-auto max-w-sm mx-auto animate-in fade-in zoom-in duration-500">
      
      <div class="flex items-center justify-between mb-2">
        <div class="heading text-xl text-primary tracking-widest">MISSION DEBRIEF</div>
        <div class="text-4xl font-bold font-mono transition-colors duration-1000" :class="tierColorClass">
          {{ tier }}
        </div>
      </div>
      
      <div class="text-[0.6rem] font-mono text-muted mb-6 tracking-[0.2em] uppercase opacity-70">{{ tierLabel }}</div>
      
      <!-- Stats Comparison Grid -->
      <div class="bg-black/60 border border-panel-border/50 p-5 mb-6 relative mt-6">
        <div class="absolute -top-3 left-6 bg-panel-border text-muted text-[0.5rem] font-bold px-3 py-1 font-mono tracking-[0.25em] uppercase shadow-lg">
          QUANTUM COMPARISON
        </div>
        
        <div class="grid grid-cols-3 gap-2 mt-2 text-center items-end">
          <div class="flex flex-col items-center">
            <span class="text-[0.5rem] text-muted font-mono mb-2 tracking-widest">YOU</span>
            <span class="text-xl font-bold text-primary tracking-tighter">{{ score || '?' }}<span class="text-xs font-normal text-muted ml-0.5">%</span></span>
            <span class="text-[0.6rem] font-bold mt-1" :class="ecoIncidentCount > 0 ? 'text-warning' : 'text-volt'">{{ ecoIncidentCount }}<span class="text-[0.4rem] font-normal text-muted block opacity-50 uppercase tracking-tighter">Errors</span></span>
          </div>
          
          <div class="flex flex-col items-center border-l border-r border-panel-border/30 px-2">
            <span class="text-[0.5rem] text-muted font-mono mb-2 tracking-widest">DELTA</span>
            <div class="text-xl font-bold tabular-nums" :class="timeDelta <= 0 ? 'text-volt' : 'text-warning'">
              <span v-if="timeDelta <= 0">-</span><span v-else>+</span>{{ Math.abs(Math.floor(timeDelta)) }}s
            </div>
            <span class="text-[0.4rem] text-muted font-mono uppercase mt-1 opacity-50">Sync Gap</span>
          </div>
          
          <div class="flex flex-col items-center">
            <span class="text-[0.5rem] text-muted font-mono mb-2 tracking-widest">PACER</span>
            <span class="text-xl font-bold text-muted opacity-60 tracking-tighter">{{ ghostScore || '?' }}<span class="text-xs font-normal text-muted ml-0.5">%</span></span>
            <div class="h-0.5 w-8 bg-void mt-2 overflow-hidden">
               <div class="h-full bg-muted" :style="{ width: ghostScore + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- AI Summary -->
      <div class="bg-black/60 border-l-2 p-3 mb-8 border-volt shadow-inner">
        <div class="text-[0.5rem] font-mono text-volt uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
          <div class="w-1 h-1 bg-volt animate-ping rounded-full"></div>
          INTELLIGENCE NODE:
          <span v-if="aiFeedbackLoading" class="animate-pulse opacity-50 italic">PROCESSING...</span>
        </div>
        <div class="text-[0.6875rem] font-mono leading-relaxed text-blue-50/90 italic tracking-wide">
          <span v-if="aiFeedback">"{{ aiFeedback }}"</span>
          <span v-else-if="!aiFeedbackLoading">"{{ aiComment }}"</span>
        </div>
      </div>
      
      <button @click="startPlayback" class="btn btn--volt w-full py-4 tracking-[0.3em] font-bold group">
        <span class="relative z-10">INITIALIZE REPLAY CONTINUUM</span>
        <div class="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
      </button>
    </div>

    <!-- ── Bottom HUD Panel ── -->
    <div class="absolute bottom-0 left-0 right-0 z-20 pointer-events-auto"
         style="padding-bottom: env(safe-area-inset-bottom);">
      
      <!-- Delta Widget (Floats above panel) -->
      <div class="absolute -top-[76px] left-1/2 -translate-x-1/2 w-52 shadow-2xl shadow-black/80 z-30">
        <DeltaWidget
          class="glass-panel !bg-void/80 !border-panel-border/40"
          :delta="timeDelta"
          :progress="progressPercent"
          show-progress
          size="lg"
        />
      </div>

      <div class="glass-panel border-t border-panel-border/30 pt-4 relative z-20 backdrop-blur-xl shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <!-- Speed & Distance -->
        <div class="grid grid-cols-2 gap-0 px-6 py-4 border-b border-panel-border/20">
          <div class="flex flex-col items-center group">
            <span class="text-[0.5rem] font-mono text-muted tracking-[0.3em] uppercase mb-1 group-hover:text-volt transition-colors">Vector Velocity</span>
            <span class="text-4xl text-primary font-bold tabular-nums tracking-tighter shadow-volt/10">
              {{ Math.round(currentSpeed) }}
              <span class="text-[0.625rem] text-muted font-mono tracking-widest ml-1 opacity-50 uppercase">KM/H</span>
            </span>
          </div>

          <div class="flex flex-col items-center border-l border-panel-border/20 group">
            <span class="text-[0.5rem] font-mono text-muted tracking-[0.3em] uppercase mb-1 group-hover:text-primary transition-colors">Sector Coverage</span>
            <span class="text-4xl text-primary font-bold tabular-nums tracking-tighter">
              {{ (totalRouteLength / 1000).toFixed(1) }}
              <span class="text-[0.625rem] text-muted font-mono tracking-widest ml-1 opacity-50 uppercase">KM</span>
            </span>
          </div>
        </div>

        <!-- Playback Controls -->
        <div class="flex items-center gap-4 px-6 py-4 justify-center">
          <button @click="togglePlayback" class="w-24 py-2 border border-volt/30 bg-volt/5 text-volt text-[0.625rem] font-mono tracking-[0.2em] hover:bg-volt/20 hover:border-volt/60 transition-all active:scale-95">
            {{ isPlaying ? 'PAUSE' : 'REPLAY' }}
          </button>
          
          <div class="w-full flex-1 max-w-[280px] flex items-center gap-4">
            <div class="h-1.5 flex-1 bg-void/50 border border-panel-border/30 relative overflow-hidden">
               <div class="absolute inset-y-0 left-0 bg-volt shadow-[0_0_10px_rgba(var(--color-volt-rgb),0.5)] transition-all duration-300" :style="{ width: progressPercent + '%' }"></div>
               <div class="absolute inset-y-0 left-0 bg-white/40 w-px animate-scanline-fast" :style="{ left: progressPercent + '%' }"></div>
            </div>
            <span class="text-[0.625rem] text-muted font-mono w-10 text-right tabular-nums opacity-60">{{ Math.round(progressPercent) }}%</span>
          </div>

          <div class="flex items-center gap-2">
            <button @click="playbackSpeed = playbackSpeed === 1 ? 10 : (playbackSpeed === 10 ? 50 : 1)" 
                    class="w-12 py-2 border border-panel-border/30 text-muted font-mono text-[0.625rem] hover:text-primary hover:border-panel-border transition-all">
              {{ playbackSpeed }}x
            </button>
            <button @click="skipToEnd" class="w-10 py-2 border border-panel-border/30 text-muted hover:text-danger hover:border-danger/30 transition-all opacity-40 hover:opacity-100">
              ⏭
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Ghost/Reality Legend ── -->
    <div class="absolute top-[180px] right-3 z-10 bg-void/40 border border-panel-border/20 backdrop-blur-md p-3 space-y-2 pointer-events-none">
      <div class="flex items-center gap-3 text-[0.5rem] font-mono tracking-widest">
        <div class="w-2 h-2 rounded-full ring-2 ring-volt/20 bg-volt" />
        <span class="text-muted uppercase">Ghost</span>
      </div>
      <div class="flex items-center gap-3 text-[0.5rem] font-mono tracking-widest">
        <div class="w-2 h-2 rounded-full ring-2 ring-primary/20 bg-primary" />
        <span class="text-muted uppercase">Reality</span>
      </div>
    </div>

    <!-- ── No Map Token Warning ── -->
    <div v-if="!hasMapToken" class="absolute inset-0 z-50 bg-void/95 flex items-center justify-center backdrop-blur-xl">
      <div class="text-center border border-danger/30 bg-danger/5 p-8 max-w-xs shadow-[0_0_40px_rgba(var(--color-danger-rgb),0.1)]">
        <div class="heading text-xl text-danger mb-4 tracking-[0.2em]">SATELLITE OFFLINE</div>
        <div class="text-muted text-[0.625rem] font-mono leading-relaxed tracking-widest uppercase">
          Authorization required.<br />
          Verify <span class="text-volt">VITE_MAPBOX_TOKEN</span> in local uplink configuration.
        </div>
      </div>
    </div>

    <!-- ── Loading Overlay ── -->
    <div v-if="historyLoading" class="absolute inset-0 z-50 bg-void flex items-center justify-center">
      <div class="text-center">
        <div class="text-volt text-sm font-mono animate-pulse tracking-[0.5em] mb-4">
          DECRYPTING TELEMETRY...
        </div>
        <div class="flex gap-1 justify-center">
          <div v-for="i in 3" :key="i" class="w-1 h-1 bg-volt rounded-full animate-bounce" :style="{ animationDelay: `${i*0.2}s` }"></div>
        </div>
      </div>
    </div>

    <!-- ── No Trip Selected ── -->
    <div v-if="!tripFrom && !destLat && hasMapToken && !historyLoading"
         class="absolute inset-0 z-40 bg-void/60 flex items-center justify-center backdrop-blur-md">
      <div class="text-center p-6 flex flex-col items-center">
        <button @click="router.push(`/trips/${vehicleCode}`)" 
                class="border border-volt px-10 py-6 bg-volt/5 text-volt heading text-xl tracking-[0.4em] hover:bg-volt/10 transition-all shadow-[0_0_30px_rgba(var(--color-volt-rgb),0.2)] group">
          <span class="relative z-10">INITIALIZE MISSION</span>
          <div class="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </button>
        <div class="mt-6 text-[0.5rem] font-mono text-muted tracking-[0.5em] uppercase opacity-40">Awaiting vector input</div>
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
import { analyzeDriver, getTripEvaluationFromGpsDozor } from '@/api/endpoints/trips'
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

// Get trip data from query params for GPS Dozor trips
const tripDataFromQuery = computed(() => {
  try {
    if (route.query.tripData) {
      return JSON.parse(decodeURIComponent(route.query.tripData as string))
    }
  } catch (e) {
    console.error('Failed to parse tripData:', e)
  }
  return null
})

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
  console.log('[GhostRun] fetchGhostReplay ghostId:', ghostId.value, 'tripData:', tripDataFromQuery.value)
  
  // Use trip data directly if available (GPS Dozor mode)
  if (tripDataFromQuery.value) {
    const trip = tripDataFromQuery.value
    // Calculate score from trip data
    const startTime = trip.StartTime || trip.startTime
    const finishTime = trip.FinishTime || trip.finishTime
    const totalDistance = trip.TotalDistance || trip.distanceKm || 0
    
    if (startTime && finishTime) {
      const durationMs = new Date(finishTime).getTime() - new Date(startTime).getTime()
      const avgSpeed = trip.AverageSpeed || (totalDistance > 0 ? (totalDistance / (durationMs / 3600000)) : 0)
      const scoreValue = Math.min(100, Math.round((avgSpeed / 80) * 50 + 20))
      ghostScore.value = scoreValue
      ghostRank.value = scoreValue >= 90 ? 'S' : scoreValue >= 80 ? 'A' : scoreValue >= 65 ? 'B' : scoreValue >= 50 ? 'C' : 'F'
    }
    return
  }
  
  // Original DB-based fetch
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

watch([destLat, destLng, ghostId, tripDataFromQuery], () => {
  fetchSmartNavigationRoute()
  fetchGhostReplay()
}, { immediate: true })

const realityPositions = computed<ApiHistoryEntry[]>(() => {
  console.log('[GhostRun] realityPositions computed:', {
    historyData: historyData.value,
    mapboxPositions: mapboxRealityPositions.value.length,
    tripFrom: tripFrom.value,
    tripTo: tripTo.value
  })
  
  if (mapboxRealityPositions.value.length > 0) return mapboxRealityPositions.value
  
  // GPS Dozor API returns array with Positions property
  if (historyData.value) {
    // Handle both array [{Positions: [...]}] and object {Positions: [...]} formats
    const data = Array.isArray(historyData.value) ? historyData.value[0] : historyData.value
    if (data?.Positions) {
      console.log('[GhostRun] Using history positions:', data.Positions.length)
      return data.Positions
    }
  }
  return []
})

const ghostPositions = computed<ApiHistoryEntry[]>(() => {
  console.log('[GhostRun] ghostId:', ghostId.value, 'fetchedGhostPositions:', fetchedGhostPositions.value.length)
  if (fetchedGhostPositions.value.length > 0) return fetchedGhostPositions.value
  
  // Demo fallback - create a slightly different route from reality
  if (realityPositions.value.length === 0) return []
  return realityPositions.value.map((p, idx) => ({
    ...p,
    Time: new Date(new Date(p.Time).getTime() - (Math.sin(idx / 10) * 5000)).toISOString(),
  }))
})

const historyLoading = computed(() => {
  console.log('[GhostRun] historyLoading:', {
    hasMapToken: hasMapToken.value,
    destLat: destLat.value,
    mapboxPositions: mapboxRealityPositions.value.length,
    historyLoadingRef: historyLoadingRef.value,
    tripFrom: tripFrom.value,
    tripTo: tripTo.value
  })
  if (!hasMapToken.value) return false
  if (destLat.value) return mapboxRealityPositions.value.length === 0
  return historyLoadingRef.value
})

// ── Eco-Driving Events ──
const { data: ecoEventsData } = useEcoDrivingEvents(vehicleCode, tripFrom, tripTo)
const ecoEventsRef = computed(() => {
  if (!ecoEventsData.value) return []
  // Handle both array and object formats
  const data = Array.isArray(ecoEventsData.value) ? ecoEventsData.value : ecoEventsData.value
  return Array.isArray(data) ? data : []
})

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

const tierColorHex = computed(() => {
  const t = tier.value
  if (t === 'S') return '#CCFF00'
  if (t === 'A') return '#34d399'
  if (t === 'B') return '#38bdf8'
  if (t === 'C') return '#fbbf24'
  return '#ef4444'
})

const tierColorClass = computed(() => {
  const t = tier.value
  if (t === 'S') return 'text-volt'
  if (t === 'A') return 'text-emerald-400'
  if (t === 'B') return 'text-sky-400'
  if (t === 'C') return 'text-amber-400'
  return 'text-danger'
})

const showDebrief = ref(true)
const aiFeedback = ref('')
const aiFeedbackLoading = ref(false)

async function fetchAiDebrief() {
  // Use trip data directly if available (GPS Dozor mode)
  if (tripDataFromQuery.value) {
    aiFeedbackLoading.value = true
    try {
      // Call the new endpoint that accepts trip data directly
      const data = await getTripEvaluationFromGpsDozor(tripDataFromQuery.value) as any
      if (data?.evaluation?.feedback) {
        aiFeedback.value = data.evaluation.feedback
      }
    } catch (e) {
      console.error('Failed to get AI debrief from GPS Dozor trip', e)
    } finally {
      aiFeedbackLoading.value = false
    }
    return
  }
  
  // Original DB-based fetch
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
watch([showDebrief, ghostId, tripDataFromQuery], ([showing, gId, tripData]) => {
  if (showing && (gId || tripData) && !aiFeedback.value && !aiFeedbackLoading.value) {
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

<style scoped>
.vertical-text {
  writing-mode: vertical-rl;
}

.animate-scanline-fast {
  animation: scanline 1.5s linear infinite;
}

@keyframes scanline {
  0% { transform: translateY(-100%); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translateY(200%); opacity: 0; }
}

.fade-fast-enter-active,
.fade-fast-leave-active {
  transition: opacity 0.3s ease;
}

.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
}
</style>
