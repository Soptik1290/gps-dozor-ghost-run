<template>
  <nav class="bottom-nav fixed bottom-0 left-0 right-0 lg:left-1/2 lg:-translate-x-1/2 lg:bottom-6 lg:w-[400px] z-50 glass-panel lg:border lg:rounded-2xl border-t border-panel-border"
       style="padding-bottom: env(safe-area-inset-bottom);">
    <div class="flex items-center justify-around h-16 lg:h-14">
      <router-link
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="nav-item flex flex-col items-center justify-center gap-1 w-16 h-full
               text-muted transition-colors duration-200"
        active-class="nav-item--active"
      >
        <component :is="item.icon" :size="20" :stroke-width="1.5" />
        <span class="text-[0.5625rem] uppercase tracking-wider font-mono">
          {{ item.label }}
        </span>
      </router-link>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LayoutDashboard, Route, Settings, Crosshair } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/authStore'

const auth = useAuthStore()

const navItems = computed(() => {
  if (auth.isAdmin) {
    return [
      { to: '/fleet-command', icon: LayoutDashboard, label: 'Fleet' },
      { to: '/trips/_', icon: Route, label: 'Trips' },
      { to: '/settings', icon: Settings, label: 'Config' },
    ]
  }

  // Driver nav
  const vehiclePlate = auth.assignedVehicle?.plate || '_'
  return [
    { to: '/cockpit', icon: Crosshair, label: 'Cockpit' },
    { to: `/trips/${vehiclePlate}`, icon: Route, label: 'My Trips' },
    { to: '/settings', icon: Settings, label: 'Config' },
  ]
})
</script>

<style scoped>
.nav-item--active {
  color: var(--color-volt);
}

.nav-item--active .lucide {
  filter: drop-shadow(0 0 6px rgba(204, 255, 0, 0.4));
}
</style>
