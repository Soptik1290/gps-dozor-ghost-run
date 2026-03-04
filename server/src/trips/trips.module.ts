import { Module } from '@nestjs/common';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { WeatherModule } from '../weather/weather.module';

@Module({
    imports: [PrismaModule, AiModule, WeatherModule],
    controllers: [TripsController],
    providers: [TripsService],
})
export class TripsModule { }
