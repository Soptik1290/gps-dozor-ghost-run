<template>
  <div class="mission-report min-h-dvh bg-void pb-24 relative overflow-hidden">
    <!-- ── Scanline Overlay ── -->
    <div class="absolute inset-0 pointer-events-none z-50 opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>

    <!-- ── Header ── -->
    <header class="glass-panel border-b border-panel-border px-6 py-6 flex items-center justify-between sticky top-0 z-40 backdrop-blur-xl">
      <button @click="goBack" class="btn btn--ghost !p-3 opacity-70 hover:opacity-100 transition-opacity">
        <ArrowLeft :size="24" />
      </button>
      <div class="text-center">
        <h1 class="heading text-2xl text-primary tracking-tighter">MISSION DEBRIEF</h1>
        <div class="text-[0.75rem] font-mono text-muted uppercase tracking-[0.4em] font-black mt-1">
           {{ vehicleCode }} <span class="mx-2 opacity-20">//</span> OPT-TRIP <span class="text-volt">{{ tripId.slice(-4) }}</span>
        </div>
      </div>
      <div class="w-12"></div> <!-- Spacer -->
    </header>

    <div v-if="loading" class="flex flex-col items-center justify-center py-32">
      <div class="w-16 h-16 border-4 border-volt/10 border-t-volt rounded-full animate-spin mb-8"></div>
      <div class="text-volt text-sm font-mono tracking-[0.3em] animate-pulse-neon">DECRYPTING TELEMETRY PACKETS...</div>
    </div>

    <div v-else-if="evalData" class="px-8 py-10 space-y-16 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      
      <!-- ── Primary Score Gauge ── -->
      <section class="flex flex-col items-center justify-center py-6 relative">
        <!-- Background Glow -->
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
           <div class="w-64 h-64 bg-volt/5 blur-3xl rounded-full"></div>
        </div>

        <div class="relative w-64 h-64 flex items-center justify-center mb-12">
          <svg class="w-full h-full -rotate-90">
            <defs>
              <linearGradient id="voltGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="var(--color-volt)" />
                <stop offset="100%" stop-color="#fff" />
              </linearGradient>
            </defs>
            <circle
              cx="128" cy="128" r="116"
              fill="none"
              stroke="currentColor"
              stroke-width="6"
              class="text-panel-border opacity-20"
            />
            <circle
              cx="128" cy="128" r="116"
              fill="none"
              stroke="url(#voltGradient)"
              stroke-width="8"
              stroke-dasharray="728"
              :stroke-dashoffset="728 - (728 * animatedScore / 100)"
              stroke-linecap="round"
              class="drop-shadow-[0_0_15px_rgba(206,255,0,0.7)] transition-all duration-1000 ease-out"
            />
          </svg>
          <!-- Score Content -->
          <div class="absolute flex flex-col items-center text-center">
            <div class="text-7xl font-black text-primary tracking-tighter leading-none mb-2 text-volt">
              {{ Math.round(animatedScore) }}<span class="text-2xl opacity-50 ml-1">%</span>
            </div>
            <div class="text-[0.7rem] font-mono text-muted tracking-[0.5em] font-black uppercase opacity-60">Success Rate</div>
          </div>
        </div>

        <!-- Rank Badge -->
        <div class="relative z-10 group">
          <div class="absolute inset-0 bg-volt blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
          <div class="bg-void border-2 border-volt text-volt px-14 py-4 rounded-sm font-black text-5xl tracking-tighter uppercase relative shadow-2xl">
             {{ evalData.evaluation.rank }} <span class="text-sm font-mono ml-4 opacity-50 tracking-[0.4em]">RANK</span>
          </div>
        </div>
      </section>

      <!-- ── Comparison Section ── -->
      <section class="grid grid-cols-2 gap-6 relative z-10">
        <div class="glass-panel p-6 border-l-4 border-volt bg-void/40 backdrop-blur-md relative overflow-hidden group">
          <div class="absolute -right-6 -top-6 text-volt/5 rotate-12 transition-transform group-hover:scale-110">
             <Activity :size="80" />
          </div>
          <div class="text-[0.65rem] font-mono text-muted mb-3 uppercase tracking-[0.3em] font-black">Temporal Delta</div>
          <div class="text-3xl font-mono text-primary font-black tracking-tighter">{{ formatDuration(evalData.evaluation.durationMs) }}</div>
          <div 
            class="text-[0.75rem] font-mono mt-3 font-black flex items-center gap-2"
            :class="evalData.evaluation.deltaSeconds <= 0 ? 'text-volt' : 'text-danger'"
          >
            <div class="w-2 h-2 rounded-full shadow-lg" :class="evalData.evaluation.deltaSeconds <= 0 ? 'bg-volt shadow-[0_0_8px_var(--color-volt)]' : 'bg-danger'"></div>
            {{ evalData.evaluation.deltaSeconds <= 0 ? 'NEGATIVE' : 'POSITIVE' }} 
            {{ Math.abs(evalData.evaluation.deltaSeconds) }}S VS PACER
          </div>
        </div>
        <div class="glass-panel p-6 border-l-4 border-blue-400 bg-void/40 backdrop-blur-md relative overflow-hidden group">
          <div class="absolute -right-6 -top-6 text-blue-400/5 rotate-12 transition-transform group-hover:scale-110">
             <Activity :size="80" />
          </div>
          <div class="text-[0.65rem] font-mono text-muted mb-3 uppercase tracking-[0.3em] font-black">Chassis Integrity</div>
          <div class="text-3xl font-mono text-primary font-black tracking-tighter">{{ evalData.evaluation.fuelConsumption.toFixed(1) }}<span class="text-lg ml-1 opacity-40">L</span></div>
          <div class="text-[0.75rem] font-mono text-blue-300 mt-3 font-black tracking-[0.2em] uppercase">
            {{ evalData.evaluation.ecoEvents }} SENSOR ALERTS
          </div>
        </div>
      </section>

      <!-- ── AI Race Engineer Debrief ── -->
      <section class="glass-panel p-8 relative overflow-hidden bg-void/60 border border-panel-border/30 rounded-xl shadow-2xl">
        <!-- Tactical Scanline -->
        <div class="absolute inset-0 bg-gradient-to-b from-transparent via-volt/5 opacity-[0.15] pointer-events-none -translate-y-full animate-scanline"></div>
        
        <div class="flex items-center gap-4 mb-6 border-b border-panel-border/30 pb-6">
          <div class="w-12 h-12 rounded-sm bg-volt/10 border border-volt/30 flex items-center justify-center text-volt relative">
            <User :size="24" />
            <div class="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-volt rounded-full border-2 border-void animate-pulse ring-4 ring-volt/20"></div>
          </div>
          <div class="flex flex-col">
            <h3 class="text-[0.85rem] font-mono text-volt font-black uppercase tracking-[0.3em]">Race Engineer Link</h3>
            <p class="text-[0.6rem] font-mono text-muted uppercase tracking-[0.4em] font-black">Tactical Mission Debrief // Secure Uplink</p>
          </div>
        </div>
        <p class="text-[0.95rem] font-mono leading-relaxed text-blue-100/90 whitespace-pre-wrap italic pl-4 border-l-4 border-volt/20 font-medium">
          "{{ evalData.evaluation.feedback || 'Establishing neural link for mission analysis...' }}"
        </p>
      </section>

      <!-- ── Mission Details ── -->
      <section class="space-y-6">
        <div class="flex items-center justify-between px-2">
          <div class="flex items-center gap-3">
            <div class="w-1.5 h-4 bg-panel-border/50"></div>
            <span class="text-[0.7rem] font-mono text-muted uppercase tracking-[0.5em] font-black">Telemetry Breakdown</span>
          </div>
          <Info :size="16" class="text-muted opacity-50" />
        </div>
        <div class="glass-panel divide-y divide-panel-border/30 bg-void/40 rounded-lg overflow-hidden border border-panel-border/20">
          <div class="flex justify-between p-6 group hover:bg-white/5 transition-colors">
            <span class="text-[0.75rem] font-mono text-muted uppercase tracking-[0.2em] group-hover:text-primary transition-colors font-bold">Start Time</span>
            <span class="text-[0.85rem] font-mono text-primary font-black">{{ formatDate(evalData.trip.startTime) }}</span>
          </div>
          <div class="flex justify-between p-6 group hover:bg-white/5 transition-colors">
            <span class="text-[0.75rem] font-mono text-muted uppercase tracking-[0.2em] group-hover:text-primary transition-colors font-bold">Finish Time</span>
            <span class="text-[0.85rem] font-mono text-primary font-black">{{ formatDate(evalData.trip.endTime) }}</span>
          </div>
          <div class="flex justify-between p-6 group hover:bg-white/5 transition-colors">
            <span class="text-[0.75rem] font-mono text-muted uppercase tracking-[0.2em] group-hover:text-primary transition-colors font-bold">Distance Traveled</span>
            <span class="text-[0.95rem] font-mono text-volt font-black">{{ evalData.trip.distanceKm?.toFixed(2) }} <span class="opacity-40 text-xs">KM</span></span>
          </div>
        </div>
      </section>

      <!-- ── Actions ── -->
      <section class="pt-10 space-y-6">
        <button @click="replayGhost" class="btn btn--volt w-full py-6 text-[0.9rem] font-black tracking-[0.5em] uppercase flex items-center justify-center gap-4 group relative overflow-hidden shadow-[0_0_30px_rgba(206,255,0,0.2)]">
          <div class="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <Play :size="24" class="group-hover:scale-125 transition-transform relative z-10" />
          <span class="relative z-10">Uplink Replay</span>
        </button>
        <button @click="goBack" class="w-full py-5 text-[0.7rem] font-mono tracking-[0.5em] uppercase text-muted hover:text-primary transition-all border border-panel-border/30 hover:bg-white/5 font-black">
          Back to Registry
        </button>
      </section>

    </div>

    <!-- ── Error State ── -->
    <div v-else class="flex flex-col items-center justify-center py-24 text-center px-10 relative z-10">
      <div class="absolute inset-0 bg-danger/5 blur-3xl rounded-full opacity-20 pointer-events-none"></div>
      <div class="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center text-danger mb-6 animate-pulse border border-danger/20">
        <AlertTriangle :size="32" />
      </div>
      <div class="text-primary font-mono text-base font-black tracking-tighter uppercase">Uplink Data Scrambled</div>
      <div class="text-muted text-[0.6rem] font-mono mt-3 leading-relaxed tracking-widest font-bold uppercase opacity-60 max-w-xs mx-auto">
        Mission telemetry packets are partially corrupted. Sector evaluation could not be fully reconstructed from the uplink.
      </div>
      <button @click="goBack" class="btn btn--outline mt-10 px-10 py-3 font-mono text-[0.6rem] tracking-[0.3em] uppercase opacity-80 hover:opacity-100">
        Abort Link
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, User, Activity, Play, Info, AlertTriangle } from 'lucide-vue-next'
import { getTripEvaluation, getTripEvaluationFromGpsDozor } from '@/api/endpoints/trips'

const route = useRoute()
const router = useRouter()

const vehicleCode = computed(() => route.params.vehicleCode as string)
const tripId = computed(() => route.params.tripId as string)
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

const loading = ref(true)
const evalData = ref<any>(null)
const error = ref<string | null>(null)

// ── Score Animation ──
const animatedScore = ref(0)
watch(evalData, (newVal) => {
  if (newVal?.evaluation?.score) {
    const target = newVal.evaluation.score
    const duration = 1200
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3) // Cubic ease out
      animatedScore.value = target * ease
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }
})

onMounted(async () => {
  try {
    if (tripDataFromQuery.value) {
      evalData.value = await getTripEvaluationFromGpsDozor(tripDataFromQuery.value)
    } else {
      evalData.value = await getTripEvaluation(tripId.value)
    }
  } catch (e: any) {
    console.error('[TripResult] Failed to load evaluation', e)
    error.value = e.message || 'Unknown error'
  } finally {
    loading.value = false
  }
})

function goBack() {
  router.push({ name: 'TripLog', params: { vehicleCode: vehicleCode.value } })
}

function replayGhost() {
  const trip = evalData.value?.trip
  const tripData = {
    ...trip,
    VehicleCode: vehicleCode.value
  }
  const tripDataString = encodeURIComponent(JSON.stringify(tripData))
  router.push({
    name: 'GhostRun',
    params: { vehicleCode: vehicleCode.value },
    query: { 
      tripData: tripDataString,
      from: trip?.startTime || trip?.StartTime,
      to: trip?.endTime || trip?.FinishTime
    }
  })
}

function formatDuration(ms: number): string {
  const diffMins = Math.floor(ms / 60000)
  const h = Math.floor(diffMins / 60)
  const m = diffMins % 60
  const s = Math.floor((ms % 60000) / 1000)
  
  if (h > 0) return `${h}H ${m}M ${s}S`
  return `${m}M ${s}S`
}

function formatDate(iso: string): string {
  if (!iso) return '--:--'
  const d = new Date(iso)
  return d.toLocaleString('cs-CZ', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  }).toUpperCase()
}
</script>

<style scoped>
.animate-in {
  animation-fill-mode: both;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-in-from-bottom-6 {
  from { 
    opacity: 0;
    transform: translateY(2rem); 
  }
  to { 
    opacity: 1;
    transform: translateY(0); 
  }
}

@keyframes scanline {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(200%); }
}

.animate-scanline {
  animation: scanline 4s linear infinite;
}

.heading {
  text-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
}
</style>
