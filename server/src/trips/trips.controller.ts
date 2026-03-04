import {
    Controller,
    Get,
    Param,
    Query,
    ParseIntPipe,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('trips')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trips')
export class TripsController {
    constructor(private readonly tripsService: TripsService) { }

    @Get()
    @ApiOperation({ summary: 'Get trip history for a vehicle' })
    @ApiQuery({ name: 'vehicleId', required: false, type: Number })
    @ApiQuery({ name: 'driverId', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Array of trips' })
    findAll(
        @Query('vehicleId') vehicleId?: string,
        @Query('driverId') driverId?: string,
    ) {
        return this.tripsService.findAll(
            vehicleId ? parseInt(vehicleId) : undefined,
            driverId ? parseInt(driverId) : undefined,
        );
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get trip details by ID' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.tripsService.findOne(id);
    }

    @Get(':id/replay')
    @ApiOperation({
        summary: 'Get full TripLog (GPS breadcrumbs) for the Ghost Replay Engine',
        description:
            'Returns dense GPS coordinates with timestamps for the replay. Used by the frontend playback engine.',
    })
    @ApiResponse({
        status: 200,
        description: 'Array of TripLog entries ordered by timestamp',
    })
    getReplay(@Param('id', ParseIntPipe) id: number) {
        return this.tripsService.getReplayData(id);
    }
}
