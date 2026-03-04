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
