<template>
  <Transition name="engineer-slide">
    <div
      v-if="message || isThinking"
      class="race-engineer flex flex-col gap-1.5 px-4 py-3 font-mono text-[0.6875rem]
             uppercase tracking-wider border-l-2 transition-all duration-300 pointer-events-auto
             relative overflow-hidden shadow-[0_5px_15px_rgba(0,0,0,0.4)]"
      :class="messageClasses"
    >
      <!-- Dynamic Scanline Overlay -->
      <div class="absolute inset-0 bg-gradient-to-b from-transparent via-current opacity-[0.05] pointer-events-none -translate-y-full animate-scanline" />
      
      <div class="flex items-center gap-2 relative z-10">
        <!-- Blinking indicator -->
        <span class="inline-block w-2 h-2 flex-shrink-0 rounded-full"
              :class="[dotClass, isThinking ? 'animate-pulse' : 'animate-pulse-neon']" />
        
        <!-- Status Label -->
        <span class="text-[0.55rem] font-bold tracking-[0.2em] opacity-80">
          {{ isThinking ? 'UPLINK ACTIVE // ANALYZING SECTORS' : (message?.type === 'danger' ? 'CRITICAL ALERT // SECTOR HAZARD' : 'TACTICAL SUPPORT // LINK ESTABLISHED') }}
        </span>
      </div>

      <!-- Typewriter Text -->
      <div v-if="!isThinking && message" class="pl-4 leading-relaxed typewriter-text relative z-10 break-words max-w-[95%]">
        <span class="opacity-40 font-bold mr-1.5">></span>{{ displayedText }}
      </div>
      
      <!-- Thinking State -->
      <div v-else-if="isThinking" class="pl-4 text-primary italic opacity-40 animate-pulse text-[0.6rem] tracking-widest">
         RECEIVING TELEMETRY PACKETS...
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import type { RaceMessage } from '@/composables/useRaceEngineer'

const props = defineProps<{
  message: RaceMessage | null
  isThinking: boolean
}>()

const messageClasses = computed(() => {
  if (props.isThinking) return 'bg-void/80 text-primary border-primary/40 backdrop-blur-md'
  if (!props.message) return ''
  switch (props.message.type) {
    case 'danger':
      return 'bg-red-950/40 text-danger border-danger/60 backdrop-blur-md'
    case 'warning':
      return 'bg-amber-950/40 text-warning border-warning/60 backdrop-blur-md'
    case 'success':
      return 'bg-volt-dim/30 text-volt border-volt/50 backdrop-blur-md'
    case 'info':
    default:
      return 'bg-void/80 text-primary/80 border-primary/20 backdrop-blur-md'
  }
})

const dotClass = computed(() => {
  if (props.isThinking) return 'bg-primary shadow-[0_0_8px_var(--color-primary)]'
  if (!props.message) return 'bg-muted'
  switch (props.message.type) {
    case 'danger': return 'bg-danger shadow-[0_0_8px_var(--color-danger)]'
    case 'warning': return 'bg-warning shadow-[0_0_8px_var(--color-warning)]'
    case 'success': return 'bg-volt shadow-[0_0_8px_var(--color-volt)]'
    default: return 'bg-muted'
  }
})

// ── Typewriter Effect ──
const displayedText = ref('')
let typewriterTimer: ReturnType<typeof setInterval> | null = null

watch(() => props.message, (newMsg) => {
  if (typewriterTimer) clearInterval(typewriterTimer)
  displayedText.value = ''
  
  if (!newMsg) return

  let i = 0
  const text = newMsg.text
  typewriterTimer = setInterval(() => {
    displayedText.value += text.charAt(i)
    i++
    if (i >= text.length) {
      if (typewriterTimer) clearInterval(typewriterTimer)
    }
  }, 15) // Slightly faster typewriter
}, { immediate: true })

onBeforeUnmount(() => {
  if (typewriterTimer) clearInterval(typewriterTimer)
})
</script>

<style scoped>
.engineer-slide-enter-active,
.engineer-slide-leave-active {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease;
}

.engineer-slide-enter-from,
.engineer-slide-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

.typewriter-text {
  text-shadow: 0 0 10px currentColor;
}

@keyframes scanline {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(200%); }
}

.animate-scanline {
  animation: scanline 3s linear infinite;
}
</style>
