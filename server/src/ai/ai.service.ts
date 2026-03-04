import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private openai: OpenAI | null = null;

    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
            this.openai = new OpenAI({ apiKey });
        } else {
            this.logger.warn('OPENAI_API_KEY not configured. AI Analysis will return mock data.');
        }
    }

    async generateDriverFeedback(weather: string, score: number, fuel: number, ecoEvents: number): Promise<string> {
        if (!this.openai) return `Mock Driver Feedback: Driving score ${score}%. Weather was ${weather}. Watch your eco events (${ecoEvents}).`;

        const prompt = `You are a Race Engineer for a logistics fleet.
Context: Driver just finished a route. Weather was ${weather}.
Input: Score ${score}%, Fuel ${fuel.toFixed(1)} l/100km, Eco Events ${ecoEvents}.
Task: Give a short, punchy 2-sentence debrief. If weather was bad, be forgiving. If weather was good and score is low, be critical. Focus on driving technique.`;

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'system', content: prompt }],
                max_tokens: 100,
            });
            return response.choices[0].message.content?.trim() || 'No feedback generated.';
        } catch (e) {
            this.logger.error('OpenAI Driver Feedback failed', e);
            return 'Driver analysis unavailable.';
        }
    }

    async generateAdminFeedback(weather: string, fuel: number, ecoEvents: number, durationHours: number): Promise<string> {
        if (!this.openai) return `Mock Admin Feedback: Trip completed in ${durationHours.toFixed(1)}h. Weather: ${weather}. Fuel avg ${fuel.toFixed(1)}. Incidents: ${ecoEvents}.`;

        const prompt = `You are a Senior Fleet Manager.
Context: Reviewing a recently completed trip. Weather was ${weather}, Duration was ${durationHours.toFixed(1)}h.
Input: Fuel Consumption ${fuel.toFixed(1)} l/100km, Eco Events ${ecoEvents}, Cost efficiency.
Task: Provide a dry, financial assessment in 2-3 sentences. Mention if weather impacted the delivery or if it's a driver skill issue. Recommend training if needed.`;

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'system', content: prompt }],
                max_tokens: 150,
            });
            return response.choices[0].message.content?.trim() || 'No feedback generated.';
        } catch (e) {
            this.logger.error('OpenAI Admin Feedback failed', e);
            return 'Admin analysis unavailable.';
        }
    }
}
