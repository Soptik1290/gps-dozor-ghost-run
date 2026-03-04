import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WeatherService {
    private readonly logger = new Logger(WeatherService.name);

    async getWeatherForTrip(lat: number, lng: number, timestamp: Date): Promise<string> {
        const isPast = timestamp.getTime() < Date.now() - 3 * 24 * 60 * 60 * 1000;
        try {
            const dateStr = timestamp.toISOString().split('T')[0];
            const url = isPast
                ? `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${dateStr}&end_date=${dateStr}&daily=weather_code,temperature_2m_max&timezone=auto`
                : `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code`;

            const response = await fetch(url);
            if (!response.ok) {
                return 'Clear, 15°C'; // Fallback
            }

            const data = await response.json();
            let code = 0;
            let temp = 15;

            if (isPast && data.daily) {
                code = data.daily.weather_code[0];
                temp = data.daily.temperature_2m_max[0];
            } else if (data.current) {
                code = data.current.weather_code;
                temp = data.current.temperature_2m;
            }

            return this.describeWeather(code, temp);
        } catch (e) {
            this.logger.error('Weather fetch failed', e);
            return 'Clear, 15°C'; // Fallback
        }
    }

    private describeWeather(code: number, temp: number): string {
        let condition = 'Clear';
        if (code >= 71 && code <= 77) condition = 'Snow / Ice';
        else if (code === 66 || code === 67) condition = 'Freezing Rain';
        else if (code >= 95 && code <= 99) condition = 'Thunderstorm';
        else if ((code >= 51 && code <= 65) || (code >= 80 && code <= 82)) condition = 'Rain';
        else if (code >= 1 && code <= 3) condition = 'Partly Cloudy';

        return `${condition}, ${Math.round(temp)}°C`;
    }
}
