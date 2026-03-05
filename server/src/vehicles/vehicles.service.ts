import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VehiclesService {
    constructor(private prisma: PrismaService) { }

    findAll() {
        return this.prisma.vehicle.findMany({
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { trips: true } } },
        });
    }

    async findAllGroups() {
        const vehicles = await this.prisma.vehicle.findMany({
            select: { groupCode: true },
            distinct: ['groupCode'],
        });
        return vehicles.map(v => ({
            Code: v.groupCode,
            Name: v.groupCode, // For now, reuse code as name
            VehicleCount: 0 // Mock count or omit
        }));
    }

    findByGroup(groupCode: string) {
        return this.prisma.vehicle.findMany({
            where: { groupCode: groupCode.toUpperCase() },
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: number) {
        const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
        if (!vehicle) throw new NotFoundException(`Vehicle #${id} not found`);
        return vehicle;
    }

    async findByCode(code: string) {
        const vehicle = await this.prisma.vehicle.findFirst({
            where: {
                OR: [
                    { plate: code },
                    { name: code }
                ]
            }
        });
        if (!vehicle) throw new NotFoundException(`Vehicle with code ${code} not found`);
        return vehicle;
    }
}
