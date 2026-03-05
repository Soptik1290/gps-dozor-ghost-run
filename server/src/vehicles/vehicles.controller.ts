import {
    Controller,
    Get,
    Param,
    ParseIntPipe,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vehicles')
export class VehiclesController {
    constructor(private readonly vehiclesService: VehiclesService) { }

    @Get()
    @Roles('ADMIN')
    @ApiOperation({ summary: '[ADMIN] List all vehicles in the fleet' })
    @ApiResponse({ status: 200, description: 'Array of vehicles' })
    findAll() {
        return this.vehiclesService.findAll();
    }

    @Get('groups')
    @ApiOperation({ summary: 'List all unique vehicle groups' })
    findAllGroups() {
        return this.vehiclesService.findAllGroups();
    }

    @Get('group/:groupCode')
    @ApiOperation({ summary: 'List vehicles in a group (by group code)' })
    @ApiResponse({ status: 200, description: 'Array of vehicles in group' })
    findByGroup(@Param('groupCode') groupCode: string) {
        return this.vehiclesService.findByGroup(groupCode);
    }

    @Get('code/:code')
    @ApiOperation({ summary: 'Get a single vehicle by code/plate' })
    findByCode(@Param('code') code: string) {
        return this.vehiclesService.findByCode(code);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single vehicle by ID' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.vehiclesService.findOne(id);
    }
}
