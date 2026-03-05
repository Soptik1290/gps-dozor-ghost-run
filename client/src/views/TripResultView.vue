<template>
  <div class="mission-report min-h-dvh bg-void pb-24">
    <!-- ── Header ── -->
    <header class="glass-panel border-b border-panel-border px-4 py-4 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
      <button @click="goBack" class="btn btn--ghost !p-2">
        <ArrowLeft :size="20" />
      </button>
      <div class="text-center">
        <h1 class="heading text-lg text-primary tracking-tighter">MISSION DEBRIEF</h1>
        <div class="text-[0.625rem] font-mono text-muted uppercase tracking-widest">{{ vehicleCode }} // TRIP #{{ tripId }}</div>
      </div>
      <div class="w-10"></div> <!-- Spacer -->
    </header>

    <div v-if="loading" class="flex flex-col items-center justify-center py-20">
      <div class="w-12 h-12 border-4 border-volt/20 border-t-volt rounded-full animate-spin mb-4"></div>
      <div class="text-volt text-xs font-mono animate-pulse">DECRYPTING TELEMETRY...</div>
    </div>

    <div v-else-if="evalData" class="px-4 py-6 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <!-- ── Primary Score Gauge ── -->
      <section class="flex flex-col items-center justify-center py-4">
        <div class="relative w-48 h-48 flex items-center justify-center mb-8">
          <!-- Circular Track -->
          <svg class="w-full h-full -rotate-90">
            <circle
              cx="96" cy="96" r="88"
              fill="none"
              stroke="currentColor"
              stroke-width="8"
              class="text-panel-border"
            />
            <circle
              cx="96" cy="96" r="88"
              fill="none"
              stroke="currentColor"
              stroke-width="8"
              stroke-dasharray="553"
              :stroke-dashoffset="553 - (553 * evalData.evaluation.score / 100)"
              stroke-linecap="round"
              class="text-volt drop-shadow-[0_0_8px_rgba(206,255,0,0.5)] transition-all duration-1000 ease-out"
            />
          </svg>
          <!-- Score Content -->
          <div class="absolute flex flex-col items-center text-center">
            <span class="text-4xl font-black text-primary tracking-tighter">{{ evalData.evaluation.score }}%</span>
            <span class="text-[0.625rem] font-mono text-volt tracking-[0.2em] font-bold uppercase">Mission Score</span>
          </div>
        </div>

        <!-- Rank Badge (Flowing normally to avoid overlap) -->
        <div class="bg-volt text-void font-black text-2xl px-8 py-2.5 rounded skew-x-[-12deg] shadow-[0_12px_32px_rgba(206,255,0,0.4)] z-20 uppercase tracking-tighter">
          RANK {{ evalData.evaluation.rank }}
        </div>
      </section>

      <!-- ── Comparison Section ── -->
      <section class="grid grid-cols-2 gap-4 relative z-10">
        <div class="glass-panel p-4 border-l-2 border-volt bg-void/60 backdrop-blur-sm">
          <div class="text-[0.625rem] font-mono text-muted mb-1 uppercase">Mission Time</div>
          <div class="text-xl font-mono text-primary">{{ formatDuration(evalData.evaluation.durationMs) }}</div>
          <div 
            class="text-[0.625rem] font-mono mt-1 font-bold"
            :class="evalData.evaluation.deltaSeconds <= 0 ? 'text-volt' : 'text-danger'"
          >
            {{ evalData.evaluation.deltaSeconds <= 0 ? '▼' : '▲' }} 
            {{ Math.abs(evalData.evaluation.deltaSeconds) }}s vs GHOST
          </div>
        </div>
        <div class="glass-panel p-4 border-l-2 border-blue-400 bg-void/60 backdrop-blur-sm">
          <div class="text-[0.625rem] font-mono text-muted mb-1 uppercase">Eco-Performance</div>
          <div class="text-xl font-mono text-primary">{{ evalData.evaluation.fuelConsumption.toFixed(1) }}L</div>
          <div class="text-[0.625rem] font-mono text-blue-300 mt-1">
            {{ evalData.evaluation.ecoEvents }} ECO EVENTS
          </div>
        </div>
      </section>

      <!-- ── AI Race Engineer Debrief ── -->
      <section class="glass-panel p-5 relative overflow-hidden">
        <div class="absolute top-0 right-0 p-2 opacity-10">
          <Activity :size="64" class="text-volt" />
        </div>
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-full bg-volt/10 flex items-center justify-center text-volt">
            <User :size="18" />
          </div>
          <div>
            <h3 class="text-xs font-mono text-volt font-bold uppercase tracking-wider">AI Race Engineer</h3>
            <p class="text-[0.625rem] font-mono text-muted">TACTICAL DEBRIEF // VERIFIED</p>
          </div>
        </div>
        <p class="text-sm font-mono leading-relaxed text-blue-100/90 whitespace-pre-wrap italic">
          "{{ evalData.evaluation.feedback }}"
        </p>
      </section>

      <!-- ── Mission Details ── -->
      <section class="space-y-3">
        <div class="flex items-center justify-between text-[0.625rem] font-mono text-muted uppercase tracking-widest px-1">
          <span>Telemetry Breakdown</span>
          <Info :size="10" />
        </div>
        <div class="glass-panel divide-y divide-panel-border">
          <div class="flex justify-between p-3">
            <span class="text-xs font-mono text-muted">START</span>
            <span class="text-xs font-mono text-primary">{{ formatDate(evalData.trip.startTime) }}</span>
          </div>
          <div class="flex justify-between p-3">
            <span class="text-xs font-mono text-muted">FINISH</span>
            <span class="text-xs font-mono text-primary">{{ formatDate(evalData.trip.endTime) }}</span>
          </div>
          <div class="flex justify-between p-3">
            <span class="text-xs font-mono text-muted">TOTAL DISTANCE</span>
            <span class="text-xs font-mono text-primary">{{ evalData.trip.distanceKm?.toFixed(1) }} km</span>
          </div>
        </div>
      </section>

      <!-- ── Actions ── -->
      <section class="pt-4 space-y-4">
        <button @click="replayGhost" class="btn btn--volt w-full py-4 text-sm font-black tracking-[0.2em] uppercase flex items-center justify-center gap-2 group">
          <Play :size="18" class="group-hover:scale-125 transition-transform" />
          REPLAY GHOST MISSION
        </button>
        <button @click="goBack" class="btn btn--outline w-full py-3 text-[0.625rem] font-mono tracking-widest uppercase">
          Return to Mission Log
        </button>
      </section>

    </div>

    <div v-else class="flex flex-col items-center justify-center py-20 text-center px-8">
      <AlertTriangle :size="32" class="text-danger mb-4" />
      <div class="text-primary font-mono text-sm">MISSION DATA CORRUPTED</div>
      <div class="text-muted text-[0.625rem] font-mono mt-2">Could not retrieve evaluation for this trip.</div>
      <button @click="goBack" class="btn btn--ghost mt-6 font-mono text-xs">GO BACK</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, User, Activity, Play, Info, AlertTriangle } from 'lucide-vue-next'
import { getTripEvaluation } from '@/api/endpoints/trips'

const route = useRoute()
const router = useRouter()

const vehicleCode = computed(() => route.params.vehicleCode as string)
const tripId = computed(() => route.params.tripId as string)

const loading = ref(true)
const evalData = ref<any>(null)

onMounted(async () => {
  try {
    evalData.value = await getTripEvaluation(tripId.value)
  } catch (e) {
    console.error('Failed to load evaluation', e)
  } finally {
    loading.value = false
  }
})

function goBack() {
  router.push({ name: 'TripLog', params: { vehicleCode: vehicleCode.value } })
}

function replayGhost() {
  router.push({
    name: 'GhostRun',
    params: { vehicleCode: vehicleCode.value },
    query: { 
      ghostId: tripId.value,
      from: evalData.value.trip.startTime,
      to: evalData.value.trip.endTime
    }
  })
}

function formatDuration(ms: number): string {
  const diffMins = Math.floor(ms / 60000)
  const h = Math.floor(diffMins / 60)
  const m = diffMins % 60
  const s = Math.floor((ms % 60000) / 1000)
  
  if (h > 0) return `${h}h ${m}m ${s}s`
  return `${m}m ${s}s`
}

function formatDate(iso: string): string {
  if (!iso) return '--:--'
  const d = new Date(iso)
  return d.toLocaleString('cs-CZ', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  })
}
</script>

<style scoped>
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-in-from-bottom-4 {
  from { transform: translateY(1rem); }
  to { transform: translateY(0); }
}

.animate-in {
  animation-fill-mode: both;
}

.mission-report {
  /* Ensure smooth transitions for neon elements */
}
</style>
