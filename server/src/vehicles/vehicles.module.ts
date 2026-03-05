import { Module } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { VehiclesController } from './vehicles.controller';
import { GpsDozorModule } from '../gps-dozor/gps-dozor.module';

@Module({
    imports: [GpsDozorModule],
    controllers: [VehiclesController],
    providers: [VehiclesService],
})
export class VehiclesModule { }
