import { ref } from 'vue'
import type { WeatherData, ApiEcoDrivingEvent } from '@/api/types'

export interface RaceMessage {
    text: string
    type: 'info' | 'warning' | 'danger' | 'success'
    timestamp: number
}

// System prompt enforcing cyberpunk Marathon persona, caps, and brevity
const SYSTEM_PROMPT = `You are a Tactical Support Unit for a high-speed logistics operative in a cyberpunk setting (Marathon style).
Your output must be:
1. Extremely concise (max 15 words).
2. Robotic, cynical, or military-styled.
3. UPPERCASE only.
4. Focused on efficiency, speed, and safety.
Do not use emojis.`

const AI_COOLDOWN_MS = 15000 // 15 seconds global cooldown for API calls

export function useRaceEngineer() {
    const isThinking = ref(false)
    const lastCallTime = ref(0)
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY

    // ── Voice Synthesis Setup ──
    const synth = window.speechSynthesis
    let voice: SpeechSynthesisVoice | null = null

    // Try to find a robotic/digital sounding voice
    function getRoboticVoice() {
        if (voice) return voice
        const voices = synth.getVoices()
        // Prefer Google US English, UK English Male, or any built-in Daniel/Alex
        voice = voices.find(v => v.name.includes('Google US English'))
            || voices.find(v => v.name.includes('UK English') && v.name.includes('Male'))
            || voices.find(v => v.name === 'Alex' || v.name === 'Daniel')
            || voices[0] || null
        return voice
    }

    // Handle async voice loading
    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = getRoboticVoice
    }

    function speak(text: string) {
        const v = getRoboticVoice()
        const utterance = new SpeechSynthesisUtterance(text)
        if (v) utterance.voice = v
        utterance.pitch = 0.8 // Slightly deeper/robotic
        utterance.rate = 1.1  // Urgent/tactical pace
        synth.speak(utterance)
    }

    // ── Core Advice Request ──
    async function requestAdvice(context: {
        speed: number
        delta: number
        weather?: WeatherData | null
        ecoEvents: ApiEcoDrivingEvent[]
    }): Promise<RaceMessage> {
        const now = Date.now()

        // 1. Fallback Logic (No API Key)
        if (!apiKey || apiKey === 'sk-placeholder_paste_your_openai_api_key_here') {
            return generateRuleBasedMessage(context.delta, context.weather, context.ecoEvents, context.speed)
        }

        // 2. Cooldown Logic
        if (now - lastCallTime.value < AI_COOLDOWN_MS) {
            console.log('AI Race Engineer: Cooldown active, skipping API call.')
            // Rejecting silent to not update UI, or returning a cached message
            throw new Error('Cooldown active')
        }

        lastCallTime.value = now
        isThinking.value = true

        // 3. Build Prompt Context
        const weatherStr = context.weather ? context.weather.trackStatus : 'UNKNOWN'
        const deltaStr = context.delta < 0
            ? `Leading by ${Math.abs(context.delta)}s`
            : `Lagging by ${context.delta}s`

        let prompt = `Status: Speed ${Math.round(context.speed)}km/h. Weather: ${weatherStr}. Delta: ${deltaStr}.`
        if (context.ecoEvents.length > 0) {
            prompt += ` Eco penalties detected: ${context.ecoEvents.length}.`
        }
        prompt += ` Give me a tactical command.`

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 30,
                    temperature: 0.7
                })
            })

            if (!response.ok) {
                throw new Error(`OpenAI API Error: ${response.status}`)
            }

            const data = await response.json()
            const aiText = data.choices[0].message.content.trim()

            return {
                text: aiText,
                type: determineMessageType(aiText, context),
                timestamp: Date.now()
            }
        } catch (err) {
            console.error('AI Race Engineer Failed:', err)
            // Fallback on error
            return generateRuleBasedMessage(context.delta, context.weather, context.ecoEvents, context.speed)
        } finally {
            isThinking.value = false
        }
    }

    // Simple heuristic to color-code AI responses
    function determineMessageType(text: string, context: any): RaceMessage['type'] {
        const lower = text.toLowerCase()
        if (lower.includes('warning') || lower.includes('hazard') || lower.includes('reduce')) return 'warning'
        if (lower.includes('critical') || lower.includes('danger') || lower.includes('abort')) return 'danger'
        if (context.delta < -5 && !lower.includes('lag')) return 'success'
        return 'info'
    }

    // ── Fallback Rule-Based Generator ──
    function generateRuleBasedMessage(
        deltaSeconds: number,
        weather: WeatherData | null | undefined,
        ecoEvents: ApiEcoDrivingEvent[],
        currentSpeed: number
    ): RaceMessage {
        const now = Date.now()

        if (weather) {
            if (weather.trackStatus === 'WET' && currentSpeed > 80) {
                return { text: '⚠ WET TRACK // REDUCE SPEED', type: 'warning', timestamp: now }
            }
            if (weather.trackStatus === 'ICY') {
                return { text: '⚠ SURFACE HAZARD // ICY CONDITIONS', type: 'danger', timestamp: now }
            }
            if (weather.trackStatus === 'STORM') {
                return { text: '⛈ STORM ACTIVE // SEEK SHELTER', type: 'danger', timestamp: now }
            }
        }

        if (currentSpeed > 130) {
            return { text: '⚠ SPEED LIMIT EXCEEDED // PENALTIES INCOMING', type: 'danger', timestamp: now }
        }

        const recentBrakingCount = ecoEvents.length
        if (recentBrakingCount >= 3) {
            return { text: `${recentBrakingCount}× HARD BRAKING // SMOOTH YOUR INPUTS`, type: 'warning', timestamp: now }
        }

        if (deltaSeconds < -10) {
            return { text: `LEADING GHOST BY ${Math.abs(Math.round(deltaSeconds))}s // PUSH MODE`, type: 'success', timestamp: now }
        } else if (deltaSeconds > 10) {
            return { text: `TRAILING GHOST BY ${Math.round(deltaSeconds)}s // CLOSE THE GAP`, type: 'warning', timestamp: now }
        }

        return { text: 'NECK AND NECK // HOLD YOUR LINE', type: 'info', timestamp: now }
    }

    return {
        isThinking,
        requestAdvice,
        speak,
        generateRuleBasedMessage
    }
}
