<template>
  <div class="app-root relative min-h-dvh bg-void flex items-center justify-center overflow-hidden">
    <!-- ── Noise Overlay (always on top) ── -->
    <NoiseOverlay />

    <!-- ── Weather tint overlay ── -->
    <div
      v-if="ui.weatherOverlay !== 'none'"
      class="weather-tint fixed inset-0 pointer-events-none z-[9997] transition-opacity duration-1000"
      :class="{
        'bg-hyper/5': ui.weatherOverlay === 'rain',
        'bg-cyan-400/5': ui.weatherOverlay === 'ice',
        'bg-danger/5': ui.weatherOverlay === 'storm',
      }"
    />

    <!-- ── Desktop Background Grid (lg only) ── -->
    <div class="hidden lg:block absolute inset-0 opacity-10 pointer-events-none"
         style="background-image: radial-gradient(#666 1px, transparent 1px); background-size: 24px 24px;">
    </div>

    <!-- ── Sidebar Helper (lg only) ── -->
    <div class="hidden lg:flex absolute left-[calc(50%+240px)] top-1/2 -translate-y-1/2 flex-col gap-4 w-64 p-6 border border-white/10 bg-[#0A0A0A]/80 backdrop-blur-md rounded-xl z-10 pointer-events-auto shadow-2xl">
      <h2 class="font-heading text-xl uppercase tracking-widest text-muted">Readme //</h2>
      <div class="text-sm font-mono text-muted/70 space-y-2">
        <p>This is a prototyping wrapper for the GPS Dozor: Ghost Run PWA.</p>
        <div class="bg-black/50 p-3 rounded border border-white/5">
          <p class="text-[0.65rem] uppercase mb-1">Test Credentials</p>
          <p><span class="text-white">U:</span> <code class="text-volt">api_gpsdozor</code></p>
          <p><span class="text-white">P:</span> <code class="text-volt">yakmwlARdn</code></p>
        </div>
      </div>
      <p class="text-volt font-mono text-sm uppercase mt-2 font-bold flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-volt animate-pulse"></span>
        Select a vehicle to start.
      </p>
    </div>

    <!-- ── Mobile / Phone Wrapper Container ── -->
    <div class="relative w-full h-full lg:w-[420px] lg:h-[850px] lg:max-h-[90vh] lg:rounded-[2.5rem] lg:border-[8px] lg:border-[#1a1a1a] shadow-2xl lg:shadow-volt/5 bg-void overflow-hidden flex flex-col items-stretch z-20">
      
      <!-- ── Notch Simulation (lg only) ── -->
      <div class="hidden lg:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#1a1a1a] rounded-b-2xl z-[9999]"></div>

      <!-- ── Main Content ── -->
      <div class="flex-1 w-full relative overflow-y-auto no-scrollbar">
        <RouterView v-slot="{ Component }">
          <Transition name="view-fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </div>

      <!-- ── Bottom Navigation (only when authenticated) ── -->
      <BottomNav v-if="auth.isAuthenticated" class="shrink-0" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import NoiseOverlay from '@/components/ui/NoiseOverlay.vue'
import BottomNav from '@/components/layout/BottomNav.vue'

const auth = useAuthStore()
const ui = useUiStore()
</script>

<style>
.view-fade-enter-active,
.view-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.view-fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.view-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
