<template>
  <div class="delta-widget relative overflow-hidden" :class="containerClass">
    <!-- Background pulse effect -->
    <div
      v-if="isActive"
      class="absolute inset-0 opacity-10 transition-all duration-300"
      :class="bgPulseClass"
    />

    <div class="relative z-10 flex flex-col items-center py-2">
      <!-- Label -->
      <span class="text-[0.5rem] uppercase tracking-[0.2em] font-mono"
            :class="isLeading ? 'text-volt' : isLagging ? 'text-danger' : 'text-muted'">
        {{ statusLabel }}
      </span>

      <!-- Delta Counter -->
      <div class="flex items-baseline gap-0.5 mt-0.5">
        <span class="text-[0.625rem] font-mono" :class="signClass">
          {{ sign }}
        </span>
        <span
          class="font-mono font-bold tabular-nums leading-none transition-colors duration-200"
          :class="[valueClass, sizeClass]"
        >
          {{ displayValue }}
        </span>
        <span class="text-[0.5rem] font-mono text-muted ml-0.5">s</span>
      </div>

      <!-- Micro progress bar -->
      <div v-if="showProgress" class="w-full h-0.5 mt-1.5 bg-surface overflow-hidden">
        <div
          class="h-full transition-all duration-300"
          :class="progressClass"
          :style="{ width: `${progress}%` }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  /** Time delta in seconds. Negative = leading, positive = lagging */
  delta: number
  /** Progress through the route (0-100) */
  progress?: number
  /** Show progress bar */
  showProgress?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}>()

const isLeading = computed(() => props.delta < -1)
const isLagging = computed(() => props.delta > 1)
const isActive = computed(() => Math.abs(props.delta) > 0)

const sign = computed(() => {
  if (props.delta < 0) return '−'
  if (props.delta > 0) return '+'
  return '±'
})

const displayValue = computed(() => {
  const abs = Math.abs(props.delta)
  if (abs >= 3600) {
    const h = Math.floor(abs / 3600)
    const m = Math.floor((abs % 3600) / 60)
    return `${h}:${String(m).padStart(2, '0')}:${String(Math.floor(abs % 60)).padStart(2, '0')}`
  }
  if (abs >= 60) {
    const m = Math.floor(abs / 60)
    return `${m}:${String(Math.floor(abs % 60)).padStart(2, '0')}`
  }
  return String(Math.floor(abs))
})

const statusLabel = computed(() => {
  if (props.delta < -1) return 'LEADING'
  if (props.delta > 1) return 'LAGGING'
  return 'MATCHED'
})

const sizeClass = computed(() => {
  switch (props.size ?? 'lg') {
    case 'sm': return 'text-lg'
    case 'md': return 'text-2xl'
    case 'lg': return 'text-3xl'
  }
})

const valueClass = computed(() => {
  if (isLeading.value) return 'text-volt text-glow-volt'
  if (isLagging.value) return 'text-danger'
  return 'text-primary'
})

const signClass = computed(() => {
  if (isLeading.value) return 'text-volt'
  if (isLagging.value) return 'text-danger'
  return 'text-muted'
})

const containerClass = computed(() => {
  if (isLeading.value) return 'border-l-2 border-volt/30'
  if (isLagging.value) return 'border-l-2 border-danger/30'
  return 'border-l-2 border-muted/20'
})

const bgPulseClass = computed(() => {
  if (isLeading.value) return 'bg-volt animate-pulse-neon'
  if (isLagging.value) return 'bg-danger animate-pulse-neon'
  return ''
})

const progressClass = computed(() => {
  if (isLeading.value) return 'bg-volt/60'
  if (isLagging.value) return 'bg-danger/60'
  return 'bg-muted/40'
})
</script>
