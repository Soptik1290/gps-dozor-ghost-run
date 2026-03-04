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
        <button @click="router.back()" class="text-muted hover:text-primary transition-colors p-2 -ml-2">
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
    <div class="absolute top-16 right-4 z-20 pointer-events-auto">
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
      
      <!-- Stats Grid -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="data-label">
          <span class="data-label__key">EFFICIENCY SCORE</span>
          <span class="data-label__value !text-lg text-primary">{{ score }}%</span>
        </div>
        <div class="data-label">
          <span class="data-label__key">TIME LOSS</span>
          <span class="data-label__value !text-lg" :class="timeLossSeconds > 0 ? 'text-warning' : 'text-volt'">
            {{ Math.floor(timeLossSeconds / 60) }}:{{ String(timeLossSeconds % 60).padStart(2, '0') }}
          </span>
        </div>
        <div class="data-label col-span-2">
          <span class="data-label__key">ECO INCIDENTS</span>
          <span class="data-label__value !text-lg" :class="ecoIncidentCount > 0 ? 'text-danger' : 'text-volt'">
            {{ ecoIncidentCount }} DETECTED
          </span>
        </div>
      </div>

      <!-- AI Summary -->
      <div class="bg-black/40 border-l-2 border-primary p-3 mb-6">
        <div class="text-[0.5rem] font-mono text-primary uppercase tracking-wider mb-1">AI TACTICAL EVALUATION</div>
        <div class="text-xs font-mono leading-relaxed text-blue-100">
          "{{ aiComment }}"
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
      <div class="absolute -top-16 left-1/2 -translate-x-1/2 w-48 shadow-lg shadow-black/50">
        <DeltaWidget
          class="glass-panel"
          :delta="timeDelta"
          :progress="progressPercent"
          show-progress
          size="lg"
        />
      </div>

      <div class="glass-panel border-t border-panel-border pt-4">
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
    <div class="absolute top-[72px] right-3 z-10 glass-panel p-2 space-y-1.5 pointer-events-none">
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
    <div v-if="!tripFrom && hasMapToken && !historyLoading"
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
import { useUiStore } from '@/stores/uiStore'
import { useGhostRun } from '@/composables/useGhostRun'
import { useDriverScore } from '@/composables/useDriverScore'
import type { ApiHistoryEntry } from '@/api/types'

const route = useRoute()
const router = useRouter()
const ui = useUiStore()

const vehicleCode = computed(() => route.params.vehicleCode as string)
const tripFrom = computed(() => (route.query.from as string) || '')
const tripTo = computed(() => (route.query.to as string) || '')

const hasMapToken = computed(() => {
  const t = import.meta.env.VITE_MAPBOX_TOKEN
  return !!t && t !== 'pk.placeholder_paste_your_token_here'
})

// ── Fetch reality history ──
const { data: historyData, isLoading: historyLoading } = useVehicleHistory(
  vehicleCode,
  tripFrom,
  tripTo
)

const realityPositions = computed<ApiHistoryEntry[]>(
  () => historyData.value?.Positions ?? []
)

// ── Mock Ghost Data for Demo ──
// We'll shift the reality positions slightly to simulate a slightly different past run
const ghostPositions = computed<ApiHistoryEntry[]>(() => {
  if (realityPositions.value.length === 0) return []
  return realityPositions.value.map((p, idx) => ({
    ...p,
    // Shift the timestamp slightly so delta isn't perfectly 0
    // Simulating the ghost being slightly faster at the start, then slower
    Time: new Date(new Date(p.Time).getTime() - (Math.sin(idx / 10) * 5000)).toISOString(),
  }))
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
const { score, tier, tierLabel, timeLossSeconds, aiComment, ecoIncidentCount } = useDriverScore(timeDelta, ecoEventsRef)

const showDebrief = ref(true)

watch(isPlaying, (playing) => {
  if (playing) showDebrief.value = false
})

watch(progressPercent, (pct) => {
  if (pct >= 100 && historyData.value?.Positions?.length && historyData.value.Positions.length > 2) {
    showDebrief.value = true
  }
})

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
