import {
    Controller,
    Get,
    Post,
    Body,
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

    @Get('/')
    @ApiOperation({ summary: 'Get trip history for a vehicle' })
    @ApiQuery({ name: 'vehicleId', required: false, type: Number })
    @ApiQuery({ name: 'driverId', required: false, type: Number })
    @ApiQuery({ name: 'vehicleCode', required: false, type: String })
    @ApiQuery({ name: 'from', required: false, type: String })
    @ApiQuery({ name: 'to', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Array of trips' })
    findAll(
        @Query('vehicleId') vehicleId?: string,
        @Query('driverId') driverId?: string,
        @Query('vehicleCode') vehicleCode?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.tripsService.findAll(
            vehicleId ? parseInt(vehicleId) : undefined,
            driverId ? parseInt(driverId) : undefined,
            vehicleCode,
            from ? new Date(from) : undefined,
            to ? new Date(to) : undefined,
        );
    }

    @Get('history')
    @ApiOperation({ summary: 'Get vehicle position history by vehicleCode and time range' })
    @ApiQuery({ name: 'vehicleCode', required: true, type: String })
    @ApiQuery({ name: 'from', required: true, type: String })
    @ApiQuery({ name: 'to', required: true, type: String })
    getHistory(
        @Query('vehicleCode') vehicleCode: string,
        @Query('from') from: string,
        @Query('to') to: string,
    ) {
        return this.tripsService.getHistory(vehicleCode, new Date(from), new Date(to));
    }

    @Get('eco-events')
    @ApiOperation({ summary: 'Get eco-driving events by vehicleCode and time range' })
    getEcoEvents(
        @Query('vehicleCode') vehicleCode: string,
        @Query('from') from: string,
        @Query('to') to: string,
    ) {
        return this.tripsService.getEcoEvents(vehicleCode, new Date(from), new Date(to));
    }

    @Post('match')
    @ApiOperation({ summary: 'Find the best historical Ghost trip based on route coordinates' })
    @ApiResponse({ status: 200, description: 'The best matching trip or null if none found' })
    async matchGhostTrip(
        @Body('currentLat') currentLat: number,
        @Body('currentLng') currentLng: number,
        @Body('destinationLat') destinationLat: number,
        @Body('destinationLng') destinationLng: number,
    ) {
        return this.tripsService.findMatch(currentLat, currentLng, destinationLat, destinationLng);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get trip details by ID' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.tripsService.findOne(id);
    }

    @Post('evaluate-gpsdozor')
    @ApiOperation({ summary: 'Get evaluation for a GPS Dozor trip (without local DB)' })
    async evaluateGpsDozorTrip(@Body() tripData: any) {
        return this.tripsService.getEvaluationFromGpsDozorTrip(tripData);
    }

    @Get(':id/evaluation')
    @ApiOperation({ summary: 'Get Post-Mission Evaluation report' })
    getEvaluation(@Param('id', ParseIntPipe) id: number) {
        return this.tripsService.getEvaluation(id);
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

    @Post(':id/analyze/driver')
    @ApiOperation({ summary: 'Get AI Context-Aware Tactical Feedback for Driver' })
    analyzeDriver(@Param('id', ParseIntPipe) id: number) {
        return this.tripsService.analyzeDriver(id);
    }

    @Post(':id/analyze/admin')
    @ApiOperation({ summary: 'Get AI Context-Aware Financial Feedback for Admin' })
    analyzeAdmin(@Param('id', ParseIntPipe) id: number) {
        return this.tripsService.analyzeAdmin(id);
    }

    @Post('analyze/admin-external')
    @ApiOperation({ summary: 'Get AI Context-Aware Financial Feedback for external GPS Dozor trip' })
    analyzeAdminExternal(@Body() tripData: any) {
        return this.tripsService.analyzeAdminGpsDozor(tripData);
    }
}
