import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GpsDozorService {
    private readonly logger = new Logger(GpsDozorService.name);
    private readonly baseUrl: string;
    private readonly username: string;
    private readonly password: string;

    constructor(private configService: ConfigService) {
        this.baseUrl = this.configService.get<string>(
            'GPS_DOZOR_URL',
            'https://a1.gpsguard.eu/api/v1'
        );
        this.username = this.configService.get<string>('GPS_DOZOR_USERNAME', 'api_gpsdozor');
        this.password = this.configService.get<string>('GPS_DOZOR_PASSWORD', 'yakmwlARdn');
    }

    private getAuthHeader(): string {
        const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
        return `Basic ${credentials}`;
    }

    private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        
        this.logger.log(`Fetching: ${url}`);
        
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.getAuthHeader(),
                    ...options.headers,
                },
            });

            if (!response.ok) {
                this.logger.error(`GPS Dozor API error: ${response.status} ${response.statusText}`);
                throw new Error(`GPS Dozor API: ${response.status}`);
            }

            return response.json();
        } catch (error) {
            this.logger.error(`Failed to fetch ${endpoint}:`, error);
            throw error;
        }
    }

    async getGroups(): Promise<any[]> {
        this.logger.log('Fetching groups from GPS Dozor API');
        return this.fetch<any[]>('/groups');
    }

    async getVehiclesByGroup(groupCode: string): Promise<any[]> {
        this.logger.log(`Fetching vehicles for group ${groupCode} from GPS Dozor API`);
        return this.fetch<any[]>(`/vehicles/group/${groupCode}`);
    }

    async getVehicles(): Promise<any[]> {
        this.logger.log('Fetching all vehicles from GPS Dozor API (getting groups first)');
        try {
            const groups = await this.getGroups();
            if (groups && groups.length > 0) {
                const firstGroup = groups[0].Code;
                return this.getVehiclesByGroup(firstGroup);
            }
            return [];
        } catch (error) {
            this.logger.error('Failed to get vehicles:', error);
            throw error;
        }
    }

    async getVehicle(vehicleCode: string): Promise<any> {
        this.logger.log(`Fetching vehicle ${vehicleCode} from GPS Dozor API`);
        return this.fetch<any>(`/vehicle/${vehicleCode}`);
    }

    async getVehicleHistory(
        vehicleCode: string,
        from: string,
        to: string
    ): Promise<any> {
        this.logger.log(`Fetching history for ${vehicleCode} from ${from} to ${to}`);
        return this.fetch<any>(
            `/vehicles/history/${vehicleCode}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
        );
    }

    async getVehicleTrips(
        vehicleCode: string,
        from?: string,
        to?: string
    ): Promise<any> {
        this.logger.log(`Fetching trips for ${vehicleCode}`);
        let endpoint = `/vehicle/${vehicleCode}/trips`;
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        if (params.toString()) endpoint += `?${params.toString()}`;
        
        return this.fetch<any>(endpoint);
    }

    async getEcoDrivingEvents(
        vehicleCode: string,
        from: string,
        to: string
    ): Promise<any[]> {
        this.logger.log(`Fetching eco-driving events for ${vehicleCode}`);
        return this.fetch<any[]>(
            `/vehicle/${vehicleCode}/eco-driving-events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
        );
    }
}
