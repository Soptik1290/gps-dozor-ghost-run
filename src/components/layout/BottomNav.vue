<template>
  <nav class="bottom-nav fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-panel-border"
       style="padding-bottom: env(safe-area-inset-bottom);">
    <div class="flex items-center justify-around h-16">
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
import { LayoutDashboard, Route, Gauge, Settings } from 'lucide-vue-next'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Fleet' },
  { to: '/trips/_', icon: Route, label: 'Trips' },
  { to: '/ghost-run/_', icon: Gauge, label: 'Ghost' },
  { to: '/settings', icon: Settings, label: 'Config' },
]
</script>

<style scoped>
.nav-item--active {
  color: var(--color-volt);
}

.nav-item--active .lucide {
  filter: drop-shadow(0 0 6px rgba(204, 255, 0, 0.4));
}
</style>
