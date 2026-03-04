<template>
  <div class="ghostrun-view relative w-full h-dvh overflow-hidden bg-void">
    <!-- ── Map ── -->
    <!-- We slice realityPositions up to currentIndex to animate the trail growing -->
    <MapContainer
      :reality-positions="animatedRealityPositions"
      :ghost-positions="ghostPositions"
      :eco-events="ecoEventsData ?? []"
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
      
      <!-- Race Engineer Banner (attached under top bar) -->
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
        <div class="flex items-center gap-2 px-4 py-3 justify-center">
          <button @click="startPlayback" class="btn btn--ghost !px-3 !py-1 text-[0.625rem]">
            ▶ REPLAY
          </button>
          <button @click="skipToEnd" class="btn btn--ghost !px-3 !py-1 text-[0.625rem]">
            ⏭ END
          </button>
        </div>

        <!-- Eco Status Strip -->
        <div class="flex items-center gap-2 px-4 pb-3 overflow-x-auto">
          <span class="text-[0.5rem] text-muted font-mono uppercase tracking-wider whitespace-nowrap">
            DRIVE QUALITY
          </span>
          <div class="h-1.5 flex-1 bg-surface relative overflow-hidden">
            <div
              class="absolute inset-y-0 left-0 transition-all duration-500"
              :class="ecoBarColor"
              :style="{ width: ecoBarWidth }"
            />
          </div>
          <span class="text-[0.5rem] font-mono font-bold" :class="ecoBarTextColor">
            {{ ecoScore }}
          </span>
        </div>
      </div>
    </div>

    <!-- ── Ghost/Reality Legend ── -->
    <div class="absolute top-[72px] right-3 z-10 glass-panel p-2 space-y-1.5 pointer-events-none">
      <div class="flex items-center gap-2 text-[0.5625rem] font-mono">
        <div class="w-5 h-0.5 bg-[#CCFF00] opacity-60" style="border-top: 2px dashed #CCFF00;" />
        <span class="text-muted">GHOST</span>
      </div>
      <div class="flex items-center gap-2 text-[0.5625rem] font-mono">
        <div class="w-5 h-0.5 bg-[#0033FF]" />
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
    <div v-if="historyLoading" class="absolute inset-0 z-30 bg-void/80 flex items-center justify-center">
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
         class="absolute inset-0 z-30 bg-void/70 flex items-center justify-center">
      <div class="text-center glass-panel p-6 max-w-xs">
        <div class="heading text-lg text-primary mb-2">NO ROUTE LOADED</div>
        <div class="text-muted text-xs font-mono leading-relaxed mb-4">
          Select a trip from the Trip Log to render the ghost trail.
        </div>
        <button @click="router.push(`/trips/${vehicleCode}`)" class="btn btn--volt text-xs">
          OPEN TRIP LOG
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
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
  currentSpeed,
  timeDelta,
  progressPercent,
  totalRouteLength,
  activeMessage,
  isThinking,
  triggerRaceEngineer,
  startPlayback,
  skipToEnd
} = useGhostRun(realityPositions, ghostPositions, weather, ecoEventsRef)

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

// ── Eco Score ──
const ecoScore = computed(() => {
  const count = ecoEventsData.value?.length ?? 0
  if (count === 0) return 'A+'
  if (count <= 3) return 'A'
  if (count <= 6) return 'B'
  if (count <= 10) return 'C'
  return 'D'
})

const ecoBarWidth = computed(() => {
  const count = ecoEventsData.value?.length ?? 0
  const pct = Math.max(10, 100 - count * 8)
  return `${pct}%`
})

const ecoBarColor = computed(() => {
  const count = ecoEventsData.value?.length ?? 0
  if (count <= 3) return 'bg-volt/60'
  if (count <= 6) return 'bg-warning/60'
  return 'bg-danger/60'
})

const ecoBarTextColor = computed(() => {
  const count = ecoEventsData.value?.length ?? 0
  if (count <= 3) return 'text-volt'
  if (count <= 6) return 'text-warning'
  return 'text-danger'
})
</script>
