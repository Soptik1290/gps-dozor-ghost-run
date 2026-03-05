import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GpsDozorService } from '../gps-dozor/gps-dozor.service';

@Injectable()
export class VehiclesService {
    private readonly logger = new Logger(VehiclesService.name);

    constructor(
        private prisma: PrismaService,
        private gpsDozor: GpsDozorService,
    ) {}

    async findAll() {
        try {
            const vehicles = await this.gpsDozor.getVehicles();
            return vehicles;
        } catch (error) {
            this.logger.warn('GPS Dozor API failed, falling back to local DB', error);
            return this.prisma.vehicle.findMany({
                orderBy: { createdAt: 'desc' },
                include: { _count: { select: { trips: true } } },
            });
        }
    }

    async findAllGroups() {
        try {
            const groups = await this.gpsDozor.getGroups();
            return groups;
        } catch (error) {
            this.logger.warn('GPS Dozor API failed, falling back to local DB', error);
            const vehicles = await this.prisma.vehicle.findMany({
                select: { groupCode: true },
                distinct: ['groupCode'],
            });
            return vehicles.map(v => ({
                Code: v.groupCode,
                Name: v.groupCode,
            }));
        }
    }

    async findByGroup(groupCode: string) {
        try {
            const vehicles = await this.gpsDozor.getVehiclesByGroup(groupCode);
            return vehicles;
        } catch (error) {
            this.logger.warn('GPS Dozor API failed, falling back to local DB', error);
            return this.prisma.vehicle.findMany({
                where: { groupCode: groupCode.toUpperCase() },
                orderBy: { name: 'asc' },
            });
        }
    }

    async findOne(id: number) {
        const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
        if (!vehicle) throw new NotFoundException(`Vehicle #${id} not found`);
        return vehicle;
    }

    async findByCode(code: string) {
        try {
            const vehicle = await this.gpsDozor.getVehicle(code);
            return vehicle;
        } catch (error) {
            this.logger.warn('GPS Dozor API failed, falling back to local DB', error);
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
}
