<template>
  <div class="app-root relative min-h-dvh bg-void flex overflow-hidden">
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

    <!-- ── Main Content ── -->
    <div class="flex-1 w-full h-full relative overflow-y-auto no-scrollbar z-20">
      <RouterView v-slot="{ Component }">
        <Transition name="view-fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </div>

    <!-- ── Sidebar Helper (lg only, floating top right) ── -->
    <div v-if="!isFullscreenRoute" class="hidden lg:flex absolute right-6 top-6 flex-col gap-4 w-64 p-5 border border-white/10 bg-[#0A0A0A]/80 backdrop-blur-md rounded-xl z-30 pointer-events-auto shadow-2xl">
      <h2 class="font-heading text-xl uppercase tracking-widest text-muted">Readme //</h2>
      <div class="text-sm font-mono text-muted/70 space-y-2">
        <p>GPS Dozor: Ghost Run PWA Desktop Client.</p>
        <div class="bg-black/50 p-3 rounded border border-white/5">
          <p class="text-[0.65rem] uppercase mb-1">Test Credentials</p>
          <p><span class="text-white">U:</span> <code class="text-volt">api_gpsdozor</code></p>
          <p><span class="text-white">P:</span> <code class="text-volt">yakmwlARdn</code></p>
        </div>
      </div>
    </div>

    <!-- ── Bottom Navigation (only when authenticated) ── -->
    <BottomNav v-if="auth.isAuthenticated && !isFullscreenRoute" class="z-50 shrink-0" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import NoiseOverlay from '@/components/ui/NoiseOverlay.vue'
import BottomNav from '@/components/layout/BottomNav.vue'

const auth = useAuthStore()
const ui = useUiStore()
const route = useRoute()

const isFullscreenRoute = computed(() => route.name === 'GhostRun')
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
