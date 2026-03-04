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

    <!-- ── Login Form ── -->
    <form
      @submit.prevent="handleLogin"
      class="relative z-10 w-full max-w-sm space-y-4"
    >
      <!-- Error message -->
      <div
        v-if="error"
        class="glass-panel border-danger/30 p-3 text-danger text-xs font-mono text-center"
      >
        {{ error }}
      </div>

      <!-- Username -->
      <div class="space-y-1">
        <label class="data-label__key" for="login-user">IDENT</label>
        <input
          id="login-user"
          v-model="username"
          type="text"
          autocomplete="username"
          placeholder="api_login"
          required
          class="login-input w-full bg-surface border border-panel-border text-primary
                 font-mono text-sm px-4 py-3.5 placeholder-dim
                 focus:border-volt focus:outline-none transition-colors"
        />
      </div>

      <!-- Password -->
      <div class="space-y-1">
        <label class="data-label__key" for="login-pass">PASSKEY</label>
        <input
          id="login-pass"
          v-model="password"
          type="password"
          autocomplete="current-password"
          placeholder="••••••••••"
          required
          class="login-input w-full bg-surface border border-panel-border text-primary
                 font-mono text-sm px-4 py-3.5 placeholder-dim
                 focus:border-volt focus:outline-none transition-colors"
        />
      </div>

      <!-- Submit -->
      <button
        type="submit"
        :disabled="isLoading"
        class="btn btn--volt w-full mt-6 relative overflow-hidden"
      >
        <span v-if="!isLoading">INITIALIZE</span>
        <span v-else class="animate-pulse-neon">CONNECTING...</span>
      </button>

      <!-- Status text -->
      <div class="text-center text-dim text-[0.625rem] font-mono uppercase tracking-wider mt-4">
        SECURE CHANNEL // BASIC AUTH
      </div>
    </form>

    <!-- ── Version footer ── -->
    <div class="absolute bottom-6 text-dim text-[0.5625rem] font-mono uppercase tracking-widest">
      v0.1.0 // GHOST_RUN::INIT
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { apiFetch } from '@/api/client'
import type { ApiGroup } from '@/api/types'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const error = ref('')
const isLoading = ref(false)

async function handleLogin() {
  if (!username.value || !password.value) return

  isLoading.value = true
  error.value = ''

  try {
    // Attempt login by calling the groups endpoint
    auth.login(username.value, password.value)
    const groups = await apiFetch<ApiGroup[]>('/groups')

    if (!groups || groups.length === 0) {
      throw new Error('No groups available for this account')
    }

    // Redirect to the original destination or dashboard
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch (err) {
    auth.logout()
    if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
      error.value = 'INVALID CREDENTIALS'
    } else if (err instanceof Error) {
      error.value = err.message
    } else {
      error.value = 'CONNECTION FAILED'
    }
  } finally {
    isLoading.value = false
  }
}
</script>
