import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GpsDozorService } from '../gps-dozor/gps-dozor.service';
import { AiService } from '../ai/ai.service';
import { WeatherService } from '../weather/weather.service';

@Injectable()
export class TripsService {
    private readonly logger = new Logger(TripsService.name);

    constructor(
        private prisma: PrismaService,
        private gpsDozor: GpsDozorService,
        private aiService: AiService,
        private weatherService: WeatherService,
    ) { }

    async findAll(vehicleId?: number, driverId?: number, vehicleCode?: string, from?: Date, to?: Date) {
        if (vehicleCode) {
            try {
                const fromStr = from ? from.toISOString() : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
                const toStr = to ? to.toISOString() : new Date().toISOString();

                if (vehicleCode === '_') {
                    // Fleet-wide fetch
                    this.logger.log('Fetching fleet-wide trips');
                    const vehicles = await this.gpsDozor.getVehicles();
                    const tripPromises = vehicles.map(v =>
                        this.gpsDozor.getVehicleTrips(v.Code, fromStr, toStr)
                            .then(trips => (Array.isArray(trips) ? trips : []).map(t => ({ ...t, VehicleCode: v.Code, VehicleName: v.Name })))
                            .catch(() => [])
                    );
                    const allTripsArrays = await Promise.all(tripPromises);
                    const allTrips = allTripsArrays.flat();

                    // Sort by StartTime descending
                    return allTrips.sort((a, b) => new Date(b.StartTime).getTime() - new Date(a.StartTime).getTime());
                }

                const gpsDozorTrips = await this.gpsDozor.getVehicleTrips(vehicleCode, fromStr, toStr);
                if (gpsDozorTrips && gpsDozorTrips.length > 0) {
                    this.logger.log(`Returning ${gpsDozorTrips.length} trips from GPS Dozor API`);
                    return gpsDozorTrips;
                }
            } catch (error) {
                this.logger.warn('GPS Dozor API failed for trips, falling back to local DB', error);
            }
        }

        return this.prisma.trip.findMany({
            where: {
                ...(vehicleId ? { vehicleId } : {}),
                ...(driverId ? { driverId } : {}),
                ...(vehicleCode ? {
                    OR: [
                        { vehicle: { name: vehicleCode } },
                        { vehicle: { plate: vehicleCode } }
                    ]
                } : {}),
                ...(from || to ? {
                    startTime: {
                        ...(from ? { gte: from } : {}),
                        ...(to ? { lte: to } : {}),
                    }
                } : {}),
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
                lat: log.lat.toFixed(6),
                lng: log.lng.toFixed(6),
                speed: log.speed,
                time: log.timestamp.toISOString(),
            })),
        };
    }

    async getHistory(vehicleCode: string, from: Date, to: Date) {
        try {
            const fromStr = from.toISOString();
            const toStr = to.toISOString();
            return await this.gpsDozor.getVehicleHistory(vehicleCode, fromStr, toStr);
        } catch (error) {
            this.logger.warn('GPS Dozor API failed for history, using local DB', error);
            const logs = await this.prisma.tripLog.findMany({
                where: {
                    trip: {
                        OR: [
                            { vehicle: { name: vehicleCode } },
                            { vehicle: { plate: vehicleCode } }
                        ],
                    },
                    timestamp: {
                        gte: from,
                        lte: to
                    }
                },
                orderBy: { timestamp: 'asc' }
            });

            return {
                Positions: logs.map(l => ({
                    Lat: l.lat.toFixed(6),
                    Lng: l.lng.toFixed(6),
                    Speed: l.speed,
                    Time: l.timestamp.toISOString()
                }))
            };
        }
    }

    async getEcoEvents(vehicleCode: string, from: Date, to: Date) {
        try {
            const fromStr = from.toISOString();
            const toStr = to.toISOString();
            return await this.gpsDozor.getEcoDrivingEvents(vehicleCode, fromStr, toStr);
        } catch (error) {
            this.logger.warn('GPS Dozor API failed for eco-events, using local DB', error);
            return [];
        }
    }

    async findMatch(currentLat: number, currentLng: number, destinationLat: number, destinationLng: number) {
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
            return null;
        }

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

        const fuel = trip.fuelConsumption || 6.5;
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

    async getEvaluation(id: number) {
        const trip = await this.findOne(id);
        const durationMs = trip.endTime.getTime() - trip.startTime.getTime();

        const ghost = await this.findMatch(
            trip.startLat ?? 0,
            trip.startLng ?? 0,
            trip.endLat ?? 0,
            trip.endLng ?? 0
        );

        let deltaSeconds = 0;
        let ghostScore = 0;

        if (ghost && ghost.id !== trip.id) {
            const ghostDurationMs = ghost.endTime.getTime() - ghost.startTime.getTime();
            deltaSeconds = Math.floor((durationMs - ghostDurationMs) / 1000);
            ghostScore = ghost.score;
        }

        const driverFeedback = await this.analyzeDriver(id);

        return {
            trip,
            evaluation: {
                score: trip.score,
                rank: trip.rank || 'B',
                durationMs,
                deltaSeconds,
                ghostScore,
                fuelConsumption: trip.fuelConsumption || 6.5,
                ecoEvents: trip.ecoEventsCount,
                feedback: driverFeedback.feedback,
            }
        };
    }

    async getEvaluationFromGpsDozorTrip(tripData: any) {
        this.logger.log(`Creating evaluation from GPS Dozor trip data for ${tripData.VehicleCode || 'unknown'}`);

        const startTime = tripData.StartTime || tripData.startTime;
        const finishTime = tripData.FinishTime || tripData.finishTime;

        if (!startTime || !finishTime) {
            this.logger.warn('Missing start/finish time in trip data', tripData);
            // Return a minimal valid structure instead of throwing to prevent frontend crash
            return {
                trip: { ...tripData, score: 0, rank: 'F' },
                evaluation: {
                    score: 0,
                    rank: 'F',
                    durationMs: 0,
                    deltaSeconds: 0,
                    ghostScore: 0,
                    fuelConsumption: 0,
                    ecoEvents: 0,
                    feedback: "MISSION DATA CORRUPTED: Temporal coordinates missing from uplink.",
                }
            };
        }

        const start = new Date(startTime);
        const finish = new Date(finishTime);
        const durationMs = finish.getTime() - start.getTime();

        const totalDistance = tripData.TotalDistance || tripData.distanceKm || tripData.Distance || 0;
        const avgSpeed = tripData.AverageSpeed || (totalDistance > 0 && durationMs > 0 ? (totalDistance / (durationMs / 3600000)) : 0);
        const maxSpeed = tripData.MaxSpeed || (avgSpeed * 1.2);
        const fuel = tripData.FuelConsumed?.Value || tripData.fuelConsumption || 0;

        // More robust score calculation
        const score = Math.min(100, Math.round(
            (Math.min(1, avgSpeed / 90) * 40) + // Efficiency based on normal highway speed
            (100 - Math.min(40, Math.max(0, maxSpeed - 130))) * 0.4 + // Penalty for overspeeding
            20
        ));

        let rank = 'C';
        if (score >= 90) rank = 'S';
        else if (score >= 80) rank = 'A';
        else if (score >= 65) rank = 'B';
        else if (score >= 50) rank = 'C';
        else rank = 'F';

        let weather = 'Clear';
        try {
            const startLat = tripData.StartPosition?.Latitude || tripData.StartPosition?.latitude || tripData.startLat || 50.0755;
            const startLng = tripData.StartPosition?.Longitude || tripData.StartPosition?.longitude || tripData.startLng || 14.4378;
            weather = await this.weatherService.getWeatherForTrip(startLat, startLng, start);
        } catch (e) {
            this.logger.warn('Failed to get weather for trip evaluation', e);
        }

        let feedback = "No tactical feedback available for this mission profile.";
        try {
            feedback = await this.aiService.generateDriverFeedback(weather, score, fuel, tripData.ecoEventsCount || 0);
        } catch (e) {
            this.logger.error('AI Service failed to generate driver feedback', e);
        }

        return {
            trip: {
                ...tripData,
                startTime: start.toISOString(),
                endTime: finish.toISOString(),
                distanceKm: totalDistance,
                avgSpeed,
                maxSpeed,
                score,
                rank,
            },
            evaluation: {
                score,
                rank,
                durationMs,
                deltaSeconds: 0,
                ghostScore: 0,
                fuelConsumption: fuel,
                ecoEvents: tripData.ecoEventsCount || 0,
                feedback,
            }
        };
    }

    async analyzeAdminGpsDozor(tripData: any) {
        this.logger.log('Analyzing external GPS Dozor trip for Admin');

        const startTime = tripData.StartTime || tripData.startTime;
        const finishTime = tripData.FinishTime || tripData.finishTime;

        if (!startTime || !finishTime) {
            return { feedback: 'Invalid trip data for analysis.', weather: 'N/A' };
        }

        const start = new Date(startTime);
        const finish = new Date(finishTime);
        const durationHours = (finish.getTime() - start.getTime()) / (1000 * 60 * 60);

        const fuel = tripData.FuelConsumed?.Value || tripData.fuelConsumption || 6.5;
        const ecoEvents = tripData.ecoEventsCount || 0;

        let weather = 'Clear';
        try {
            const startLat = tripData.StartPosition?.Latitude || tripData.StartPosition?.latitude || 50.0755;
            const startLng = tripData.StartPosition?.Longitude || tripData.StartPosition?.longitude || 14.4378;
            weather = await this.weatherService.getWeatherForTrip(startLat, startLng, start);
        } catch (e) {
            this.logger.warn('Failed to get weather for external analysis', e);
        }

        const feedback = await this.aiService.generateAdminFeedback(weather, fuel, ecoEvents, durationHours);

        return { feedback, weather };
    }
}
