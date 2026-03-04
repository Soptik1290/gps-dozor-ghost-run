import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TripsService {
    constructor(private prisma: PrismaService) { }

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
}
