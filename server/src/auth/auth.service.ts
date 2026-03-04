import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { username: dto.username },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Fetch driver's assigned vehicle (first trip vehicle as default)
        let assignedVehicle = null;
        if (user.role === 'DRIVER') {
            const latestTrip = await this.prisma.trip.findFirst({
                where: { driverId: user.id },
                include: { vehicle: true },
                orderBy: { startTime: 'desc' },
            });
            assignedVehicle = latestTrip?.vehicle ?? null;
        }

        const payload = { sub: user.id, username: user.username, role: user.role };
        const token = this.jwtService.sign(payload);

        return {
            access_token: token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
            },
            assignedVehicle,
        };
    }
}
