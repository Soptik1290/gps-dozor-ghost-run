<template>
  <div class="settings-view min-h-dvh pb-20 bg-void">
    <!-- ── Header ── -->
    <header class="glass-panel border-b border-panel-border px-4 py-3">
      <h1 class="heading text-lg text-primary">CONFIGURATION</h1>
      <div class="text-muted text-[0.625rem] font-mono mt-0.5">
        SYS::SETTINGS v0.1.0
      </div>
    </header>

    <div class="px-4 py-4 space-y-4">
      <!-- ── Account Section ── -->
      <section class="glass-panel p-4">
        <div class="heading text-xs text-muted mb-3">ACCOUNT</div>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-mono text-primary">{{ auth.username }}</div>
            <div class="text-[0.625rem] font-mono text-muted">BASIC AUTH // ACTIVE</div>
          </div>
          <button @click="handleLogout" class="btn btn--ghost text-xs !py-2 !px-3 text-danger">
            <LogOut :size="14" />
            LOGOUT
          </button>
        </div>
      </section>

      <!-- ── Crew Section ── -->
      <section class="glass-panel p-4">
        <div class="heading text-xs text-muted mb-3">CREW MODULE</div>
        <div class="text-[0.6875rem] font-mono text-dim leading-relaxed">
          Crew module will enable team tracking and real-time teammate positions on the map.
        </div>
        <div class="mt-3 hud-badge hud-badge--wet inline-flex">
          COMING SOON
        </div>
      </section>

      <!-- ── Map Section ── -->
      <section class="glass-panel p-4">
        <div class="heading text-xs text-muted mb-3">MAP ENGINE</div>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-[0.6875rem] font-mono text-primary">3D BUILDINGS</span>
            <span class="text-[0.625rem] font-mono text-volt">ENABLED</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[0.6875rem] font-mono text-primary">MAP STYLE</span>
            <span class="text-[0.625rem] font-mono text-muted">DARK-V11</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[0.6875rem] font-mono text-primary">MAPBOX TOKEN</span>
            <span class="text-[0.625rem] font-mono" :class="hasToken ? 'text-volt' : 'text-danger'">
              {{ hasToken ? 'SET' : 'MISSING' }}
            </span>
          </div>
        </div>
      </section>

      <!-- ── Weather Section ── -->
      <section class="glass-panel p-4">
        <div class="heading text-xs text-muted mb-3">TRACK CONDITIONS</div>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-[0.6875rem] font-mono text-primary">PROVIDER</span>
            <span class="text-[0.625rem] font-mono text-muted">OPEN-METEO</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[0.6875rem] font-mono text-primary">AUTO REFRESH</span>
            <span class="text-[0.625rem] font-mono text-volt">15 MIN</span>
          </div>
        </div>
      </section>

      <!-- ── About ── -->
      <section class="glass-panel p-4">
        <div class="heading text-xs text-muted mb-3">SYSTEM</div>
        <div class="space-y-2 text-[0.6875rem] font-mono">
          <div class="flex justify-between">
            <span class="text-muted">BUILD</span>
            <span class="text-dim">GHOST_RUN::v0.1.0</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">API</span>
            <span class="text-dim">a1.gpsguard.eu/api/v1</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">STACK</span>
            <span class="text-dim">VUE3+VITE+MAPBOX</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LogOut } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/authStore'

const auth = useAuthStore()

const hasToken = computed(() => {
  const token = import.meta.env.VITE_MAPBOX_TOKEN
  return !!token && token !== 'pk.placeholder_paste_your_token_here'
})

function handleLogout() {
  auth.logout()
}
</script>
