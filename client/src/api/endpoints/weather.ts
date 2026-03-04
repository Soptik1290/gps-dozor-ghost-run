import { useQuery } from '@tanstack/vue-query'
import { type Ref, computed } from 'vue'
import type { WeatherData, TrackStatus } from '@/api/types'

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast'

/**
 * Derive track status from WMO weather codes.
 * See: https://open-meteo.com/en/docs#weathervariables
 */
function deriveTrackStatus(code: number, temp: number): { status: TrackStatus; description: string } {
    // Snow / Ice
    if (code >= 71 && code <= 77) {
        return { status: 'ICY', description: 'SNOW / ICE DETECTED' }
    }
    // Freezing rain/drizzle
    if (code === 66 || code === 67) {
        return { status: 'ICY', description: 'FREEZING RAIN' }
    }
    // Thunderstorm
    if (code >= 95 && code <= 99) {
        return { status: 'STORM', description: 'THUNDERSTORM ACTIVE' }
    }
    // Rain / Drizzle / Showers
    if ((code >= 51 && code <= 65) || (code >= 80 && code <= 82)) {
        return { status: 'WET', description: 'RAIN — TRACTION LOSS RISK' }
    }
    // Near freezing on dry road
    if (temp <= 2) {
        return { status: 'ICY', description: 'SURFACE FREEZE RISK' }
    }
    // Clear / Cloudy
    return { status: 'DRY', description: 'OPTIMAL CONDITIONS' }
}

/**
 * Fetch current weather from OpenMeteo for a given lat/lng.
 * Refreshes every 15 minutes.
 */
export function useWeather(
    lat: Ref<number | undefined>,
    lng: Ref<number | undefined>
) {
    return useQuery({
        queryKey: ['weather', lat, lng],
        queryFn: async (): Promise<WeatherData> => {
            const url = `${OPEN_METEO_BASE}?latitude=${lat.value}&longitude=${lng.value}&current=temperature_2m,rain,snowfall,weather_code`
            const resp = await fetch(url)
            if (!resp.ok) throw new Error('Weather fetch failed')
            const json = await resp.json()

            const current = json.current
            const weatherCode: number = current.weather_code ?? 0
            const temperature: number = current.temperature_2m ?? 0
            const rain: number = current.rain ?? 0
            const snowfall: number = current.snowfall ?? 0

            const { status, description } = deriveTrackStatus(weatherCode, temperature)

            return {
                temperature,
                weatherCode,
                trackStatus: status,
                description,
                rain,
                snowfall,
            }
        },
        enabled: () => lat.value !== undefined && lng.value !== undefined,
        refetchInterval: 15 * 60 * 1000, // 15 minutes
        staleTime: 10 * 60 * 1000,        // 10 minutes
    })
}
