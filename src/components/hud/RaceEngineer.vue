<template>
  <Transition name="engineer-slide">
    <div
      v-if="message || isThinking"
      class="race-engineer flex flex-col gap-1 px-3 py-2 font-mono text-[0.625rem]
             uppercase tracking-wider border-l-2 transition-all duration-300 pointer-events-auto"
      :class="messageClasses"
    >
      <div class="flex items-center gap-2">
        <!-- Blinking indicator -->
        <span class="inline-block w-1.5 h-1.5 flex-shrink-0"
              :class="[dotClass, isThinking ? 'animate-pulse' : 'animate-pulse-neon']" />
        
        <!-- Status Label -->
        <span class="text-muted text-[0.5rem] font-bold">
          {{ isThinking ? 'UPLINK ACTIVE // PROCESSING...' : 'TACTICAL SUPPORT' }}
        </span>
      </div>

      <!-- Typewriter Text -->
      <div v-if="!isThinking && message" class="pl-3.5 leading-tight typewriter-text">
        {{ displayedText }}
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
  if (props.isThinking) return 'bg-panel/80 text-primary border-primary/40 backdrop-blur-md'
  if (!props.message) return ''
  switch (props.message.type) {
    case 'danger':
      return 'bg-danger/10 text-danger border-danger/40 backdrop-blur-md'
    case 'warning':
      return 'bg-warning/10 text-warning border-warning/40 backdrop-blur-md'
    case 'success':
      return 'bg-volt-dim text-volt border-volt/40 backdrop-blur-md'
    case 'info':
    default:
      return 'bg-panel/80 text-muted border-muted/20 backdrop-blur-md'
  }
})

const dotClass = computed(() => {
  if (props.isThinking) return 'bg-primary'
  if (!props.message) return 'bg-muted'
  switch (props.message.type) {
    case 'danger': return 'bg-danger'
    case 'warning': return 'bg-warning'
    case 'success': return 'bg-volt'
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
  typewriterTimer = setInterval(() => {
    displayedText.value += newMsg.text.charAt(i)
    i++
    if (i >= newMsg.text.length) {
      if (typewriterTimer) clearInterval(typewriterTimer)
    }
  }, 20) // 20ms per character for fast terminal feel
}, { immediate: true })

onBeforeUnmount(() => {
  if (typewriterTimer) clearInterval(typewriterTimer)
})
</script>

<style scoped>
.engineer-slide-enter-active,
.engineer-slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.engineer-slide-enter-from,
.engineer-slide-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}

.typewriter-text {
  text-shadow: 0 0 4px currentColor;
}
</style>
