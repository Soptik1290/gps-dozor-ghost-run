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
}
