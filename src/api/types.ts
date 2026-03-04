// ═══════════════════════════════════════
// GPS Dozor API — Raw Response Types
// Mirrored exactly from API documentation
// ═══════════════════════════════════════

// ── Enums ──

export enum VolumeUnit {
    Litre = 0,
    UsGallon = 1,
    UkGallon = 2,
}

export enum CurrencyCode {
    CZK = 0,
    EUR = 1,
    USD = 2,
    PLN = 3,
    HUF = 4,
    BGN = 5,
    BRL = 6,
    BYR = 7,
    CAD = 8,
    CHF = 9,
}

export enum EcoDrivingEventType {
    Unknown = 0,
    CorneringLeft = 1,
    CorneringRight = 2,
    Cornering = 3,
    Acceleration = 4,
    Braking = 5,
    Bump = 6,
    LongClutch = 7,
    DriveOnNeutral = 8,
    LongFreeWheel = 9,
}

export enum EventSeverity {
    None = 0,
    Low = 1,
    Medium = 2,
    High = 3,
}

export enum EngineRelayState {
    Initial = 0,
    StopSentUnconfirmed = 1,
    StopSentConfirmed = 2,
    CancelSentUnconfirmed = 3,
    CancelSentConfirmed = 4,
    Rejected = 5,
}

// ── Shared ──

export interface ApiPosition {
    Latitude: string
    Longitude: string
}

export interface ApiGroup {
    Code: string
    Name: string
}

// ── Vehicles ──

export interface ApiVehicle {
    Code: string
    GroupCode: string
    BranchId: string
    BranchName: string
    Name: string
    SPZ: string
    BatteryPercentage: number
    Speed: number
    LastPosition: ApiPosition
    LastPositionTimestamp: string
    LastEngineRelayEvent: string
    EngineRelayState: EngineRelayState
    Odometer: number
    RefuelingCards: string[]
}

// ── Trips ──

export interface ApiFuelConsumed {
    Value: number
    VolumeUnit: VolumeUnit
}

export interface ApiTripCost {
    Value: number
    Currency: CurrencyCode
}

export interface ApiTrip {
    AverageSpeed: number
    MaxSpeed: number
    TripType: boolean
    StartTime: string
    FinishTime: string
    StartPosition: ApiPosition
    FinishPosition: ApiPosition
    StartAddress: string
    FinishAddress: string
    TripLength: string
    TripWaitingTime: string
    TotalDistance: number
    Purpose: string
    DriverName: string
    DriverChipCode: string
    Driver2Name: string
    Driver2ChipCode: string
    Odometer: number
    FuelConsumed: ApiFuelConsumed
    TripCost: ApiTripCost
}

// ── History ──

export interface ApiHistoryEntry {
    Lat: string
    Lng: string
    Time: string
    Speed: number
}

export interface ApiVehicleHistory {
    Name: string
    VehicleCode: string
    From: string
    To: string
    Positions: ApiHistoryEntry[]
}

// ── Eco Driving ──

export interface ApiEcoDrivingEvent {
    EventType: EcoDrivingEventType
    EventValue: number
    Timestamp: string
    Position: {
        Latitude: number
        Longitude: number
    }
    EventSeverity: EventSeverity
    Speed: number
}

// ── Sensors ──

export interface ApiSensorDataPoint {
    t: string
    v: number
}

export interface ApiSensorItem {
    name: string
    units: string
    data: ApiSensorDataPoint[]
}

export interface ApiSensorResponse {
    items: ApiSensorItem[]
}

// ═══════════════════════════════════════
// CLIENT-SIDE ENRICHED TYPES
// ═══════════════════════════════════════

// ── Crew (Future-Ready) ──

export interface CrewMember {
    id: string
    displayName: string
    avatarUrl?: string
    vehicleCode?: string
    isOnline: boolean
    lastSeen: Date
}

export interface CrewSettings {
    showCrewOnMap: boolean
    notifyOnCrewEvents: boolean
    crewColor: string
}

// ── Enriched Vehicle ──

export interface Vehicle extends ApiVehicle {
    crewMemberId?: string
    isTeammate: boolean
    crewMember?: CrewMember
    ghostTripId?: string
    personalBest?: {
        routeHash: string
        tripTime: number
    }
    isMoving: boolean
    lastSeenAgo: number
}

// ── User ──

export interface User {
    login: string
    groups: ApiGroup[]
    crewId?: string
    crewMembers: CrewMember[]
    crewSettings: CrewSettings
}

// ── Weather (OpenMeteo) ──

export type TrackStatus = 'DRY' | 'WET' | 'ICY' | 'STORM'

export interface WeatherData {
    temperature: number
    weatherCode: number
    trackStatus: TrackStatus
    description: string
    rain: number
    snowfall: number
}
