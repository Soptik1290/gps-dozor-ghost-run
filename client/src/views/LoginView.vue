<template>
  <div class="login-view min-h-dvh flex flex-col items-center justify-center px-6 bg-void relative">
    <!-- ── Decorative grid lines ── -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
      <div class="absolute top-0 left-1/4 w-px h-full bg-primary" />
      <div class="absolute top-0 left-2/4 w-px h-full bg-primary" />
      <div class="absolute top-0 left-3/4 w-px h-full bg-primary" />
      <div class="absolute top-1/4 left-0 w-full h-px bg-primary" />
      <div class="absolute top-2/4 left-0 w-full h-px bg-primary" />
      <div class="absolute top-3/4 left-0 w-full h-px bg-primary" />
    </div>

    <!-- ── Brand Header ── -->
    <div class="relative z-10 text-center mb-12">
      <div class="text-muted text-[0.625rem] uppercase tracking-[0.3em] mb-3 font-mono">
        SYS::AUTHENTICATE
      </div>
      <h1 class="heading text-4xl sm:text-5xl text-primary mb-2">
        GHOST RUN
      </h1>
      <div class="heading text-sm text-volt tracking-[0.2em]">
        GPS DOZOR
      </div>
      <div class="mt-4 h-px w-32 mx-auto bg-gradient-to-r from-transparent via-volt/40 to-transparent" />
    </div>

    <!-- ── Error Display ── -->
    <div
      v-if="error"
      class="relative z-10 w-full max-w-md glass-panel border-danger/30 p-3 text-danger text-xs font-mono text-center mb-6"
    >
      {{ error }}
    </div>

    <!-- ── Demo Login Buttons ── -->
    <div class="relative z-10 w-full max-w-md space-y-4">
      <!-- Admin Button -->
      <button
        @click="loginAs('admin')"
        :disabled="isLoading"
        class="login-card group w-full p-5 border border-panel-border bg-surface
               hover:border-volt hover:bg-panel-hover transition-all duration-300
               active:scale-[0.98] text-left relative overflow-hidden"
      >
        <div class="absolute top-0 right-0 w-20 h-20 bg-volt/5 -translate-y-1/2 translate-x-1/2 rounded-full
                    group-hover:bg-volt/10 transition-colors" />
        <div class="relative z-10">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 border border-volt/40 bg-volt-dim flex items-center justify-center">
              <Shield :size="20" class="text-volt" />
            </div>
            <div>
              <div class="heading text-base text-primary group-hover:text-volt transition-colors">
                FLEET MANAGER ACCESS
              </div>
              <div class="text-muted text-[0.625rem] font-mono">ADMIN // api_gpsdozor</div>
            </div>
          </div>
          <div class="text-muted text-[0.5625rem] font-mono mt-2 pl-[52px]">
            Full fleet overview, vehicle monitoring, and management reporting.
          </div>
        </div>
        <div v-if="isLoading && loadingRole === 'admin'" class="absolute inset-0 bg-void/60 flex items-center justify-center">
          <span class="text-volt text-sm font-mono animate-pulse-neon">CONNECTING...</span>
        </div>
      </button>

      <!-- Driver Button -->
      <button
        @click="loginAs('driver')"
        :disabled="isLoading"
        class="login-card group w-full p-5 border border-panel-border bg-surface
               hover:border-hyper hover:bg-panel-hover transition-all duration-300
               active:scale-[0.98] text-left relative overflow-hidden"
      >
        <div class="absolute top-0 right-0 w-20 h-20 bg-hyper/5 -translate-y-1/2 translate-x-1/2 rounded-full
                    group-hover:bg-hyper/10 transition-colors" />
        <div class="relative z-10">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 border border-hyper/40 bg-hyper/10 flex items-center justify-center">
              <Crosshair :size="20" class="text-hyper" />
            </div>
            <div>
              <div class="heading text-base text-primary group-hover:text-hyper transition-colors">
                PILOT UPLINK
              </div>
              <div class="text-muted text-[0.625rem] font-mono">DRIVER // pilot_petr</div>
            </div>
          </div>
          <div class="text-muted text-[0.5625rem] font-mono mt-2 pl-[52px]">
            Personal cockpit, ghost navigation, and race scoring engine.
          </div>
        </div>
        <div v-if="isLoading && loadingRole === 'driver'" class="absolute inset-0 bg-void/60 flex items-center justify-center">
          <span class="text-hyper text-sm font-mono animate-pulse-neon">CONNECTING...</span>
        </div>
      </button>
    </div>

    <!-- ── Separator ── -->
    <div class="relative z-10 w-full max-w-md flex items-center gap-3 my-6">
      <div class="flex-1 h-px bg-panel-border" />
      <span class="text-dim text-[0.5625rem] font-mono uppercase tracking-wider">or enter manually</span>
      <div class="flex-1 h-px bg-panel-border" />
    </div>

    <!-- ── Manual Login (collapsed) ── -->
    <form
      @submit.prevent="handleManualLogin"
      class="relative z-10 w-full max-w-md"
    >
      <div class="flex gap-2">
        <input
          v-model="manualUser"
          type="text"
          placeholder="username"
          class="flex-1 bg-surface border border-panel-border text-primary
                 font-mono text-xs px-3 py-2.5 placeholder-dim
                 focus:border-volt focus:outline-none transition-colors"
        />
        <input
          v-model="manualPass"
          type="password"
          placeholder="password"
          class="flex-1 bg-surface border border-panel-border text-primary
                 font-mono text-xs px-3 py-2.5 placeholder-dim
                 focus:border-volt focus:outline-none transition-colors"
        />
        <button type="submit" :disabled="isLoading" class="btn btn--ghost text-xs !py-2.5 !px-4">
          →
        </button>
      </div>
    </form>

    <!-- ── Version footer ── -->
    <div class="absolute bottom-6 text-dim text-[0.5625rem] font-mono uppercase tracking-widest">
      v2.0.0 // ROLE-BASED ACCESS
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { Shield, Crosshair } from 'lucide-vue-next'

const router = useRouter()
const auth = useAuthStore()

const error = ref('')
const isLoading = ref(false)
const loadingRole = ref<'admin' | 'driver' | null>(null)
const manualUser = ref('')
const manualPass = ref('')

const DEMO_ACCOUNTS = {
  admin: { username: 'api_gpsdozor', password: 'yakmwlARdn' },
  driver: { username: 'pilot_petr', password: 'password123' },
}

async function loginAs(role: 'admin' | 'driver') {
  isLoading.value = true
  loadingRole.value = role
  error.value = ''

  try {
    const creds = DEMO_ACCOUNTS[role]
    await auth.login(creds.username, creds.password)
    router.push(auth.homeRoute)
  } catch (err) {
    if (err instanceof Error) {
      error.value = err.message
    } else {
      error.value = 'CONNECTION FAILED'
    }
  } finally {
    isLoading.value = false
    loadingRole.value = null
  }
}

async function handleManualLogin() {
  if (!manualUser.value || !manualPass.value) return

  isLoading.value = true
  error.value = ''

  try {
    await auth.login(manualUser.value, manualPass.value)
    router.push(auth.homeRoute)
  } catch (err) {
    if (err instanceof Error) {
      error.value = err.message
    } else {
      error.value = 'CONNECTION FAILED'
    }
  } finally {
    isLoading.value = false
  }
}
</script>
