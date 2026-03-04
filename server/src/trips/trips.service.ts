import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { WeatherService } from '../weather/weather.service';

@Injectable()
export class TripsService {
    constructor(
        private prisma: PrismaService,
        private aiService: AiService,
        private weatherService: WeatherService,
    ) { }

    findAll(vehicleId?: number, driverId?: number) {
        return this.prisma.trip.findMany({
            where: {
                ...(vehicleId ? { vehicleId } : {}),
                ...(driverId ? { driverId } : {}),
            },
            include: {
                vehicle: { select: { id: true, name: true, plate: true } },
                driver: { select: { id: true, username: true } },
            },
            orderBy: { startTime: 'desc' },
        });
    }

    async findOne(id: number) {
        const trip = await this.prisma.trip.findUnique({
            where: { id },
            include: {
                vehicle: true,
                driver: { select: { id: true, username: true } },
                _count: { select: { logs: true } },
            },
        });
        if (!trip) throw new NotFoundException(`Trip #${id} not found`);
        return trip;
    }

    async getReplayData(id: number) {
        const trip = await this.prisma.trip.findUnique({ where: { id } });
        if (!trip) throw new NotFoundException(`Trip #${id} not found`);

        const logs = await this.prisma.tripLog.findMany({
            where: { tripId: id },
            orderBy: { timestamp: 'asc' },
            select: {
                lat: true,
                lng: true,
                speed: true,
                timestamp: true,
            },
        });

        return {
            tripId: id,
            startTime: trip.startTime,
            endTime: trip.endTime,
            distanceKm: trip.distanceKm,
            score: trip.score,
            rank: trip.rank,
            positions: logs.map((log) => ({
                Lat: log.lat.toFixed(6),
                Lng: log.lng.toFixed(6),
                Speed: log.speed,
                Time: log.timestamp.toISOString(),
            })),
        };
    }

    async findMatch(currentLat: number, currentLng: number, destinationLat: number, destinationLng: number) {
        // Haversine formula directly in SQL to find trips matching start and end points within 1km
        const matches = await this.prisma.$queryRaw<Array<{ id: number }>>`
            SELECT id 
            FROM "Trip"
            WHERE 
                "startLat" IS NOT NULL AND "startLng" IS NOT NULL
                AND "endLat" IS NOT NULL AND "endLng" IS NOT NULL
                AND (
                    6371 * acos(
                        cos(radians(${currentLat})) * cos(radians("startLat")) * cos(radians("startLng") - radians(${currentLng})) + 
                        sin(radians(${currentLat})) * sin(radians("startLat"))
                    )
                ) <= 1.5
                AND (
                    6371 * acos(
                        cos(radians(${destinationLat})) * cos(radians("endLat")) * cos(radians("endLng") - radians(${destinationLng})) + 
                        sin(radians(${destinationLat})) * sin(radians("endLat"))
                    )
                ) <= 1.5
            ORDER BY score DESC
            LIMIT 1
        `;

        if (!matches || matches.length === 0) {
            return null; // Pacemaker — no ghost found
        }

        // Return the full trip details + replay logs for the ghost rendering
        const ghostId = matches[0].id;
        const tripData = await this.findOne(ghostId);
        const replayData = await this.getReplayData(ghostId);

        return {
            ...tripData,
            replay: replayData.positions
        };
    }

    async analyzeDriver(id: number) {
        const trip = await this.findOne(id);
        if (trip.aiDriverFeedback) {
            return { feedback: trip.aiDriverFeedback, weather: trip.weatherSnapshot };
        }

        let weather = trip.weatherSnapshot;
        if (!weather) {
            const lat = trip.startLat ?? 50.08;
            const lng = trip.startLng ?? 14.42;
            weather = await this.weatherService.getWeatherForTrip(lat, lng, trip.startTime);
            await this.prisma.trip.update({ where: { id }, data: { weatherSnapshot: weather } });
        }

        const fuel = trip.fuelConsumption || 6.5; // Fallback fuel
        const feedback = await this.aiService.generateDriverFeedback(weather, trip.score, fuel, trip.ecoEventsCount);

        await this.prisma.trip.update({ where: { id }, data: { aiDriverFeedback: feedback } });

        return { feedback, weather };
    }

    async analyzeAdmin(id: number) {
        const trip = await this.findOne(id);
        if (trip.aiAdminFeedback) {
            return { feedback: trip.aiAdminFeedback, weather: trip.weatherSnapshot };
        }

        let weather = trip.weatherSnapshot;
        if (!weather) {
            const lat = trip.startLat ?? 50.08;
            const lng = trip.startLng ?? 14.42;
            weather = await this.weatherService.getWeatherForTrip(lat, lng, trip.startTime);
            await this.prisma.trip.update({ where: { id }, data: { weatherSnapshot: weather } });
        }

        const durationHours = (trip.endTime.getTime() - trip.startTime.getTime()) / (1000 * 60 * 60);
        const fuel = trip.fuelConsumption || 6.5;
        const feedback = await this.aiService.generateAdminFeedback(weather, fuel, trip.ecoEventsCount, durationHours);

        await this.prisma.trip.update({ where: { id }, data: { aiAdminFeedback: feedback } });

        return { feedback, weather };
    }
}
