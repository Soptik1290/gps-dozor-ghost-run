import 'dotenv/config' // Must be first — loads DATABASE_URL for Prisma v7
import { PrismaClient, Role, VehicleStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────
// GPS Track Generator — Prague city route
// Creates realistic sinusoidal TripLog data
// ─────────────────────────────────────────────
function generatePragueRoute(
    startLat: number,
    startLng: number,
    startTime: Date,
    durationSeconds: number,
    avgSpeedKmh: number,
): Array<{ lat: number; lng: number; speed: number; timestamp: Date }> {
    const logs: Array<{ lat: number; lng: number; speed: number; timestamp: Date }> = [];
    const intervalSeconds = 1; // 1 point per second for dense replay data
    const totalPoints = Math.floor(durationSeconds / intervalSeconds);

    // Approximate meters per degree at Prague latitude
    const metersPerDegLat = 111320;
    const metersPerDegLng = 111320 * Math.cos((startLat * Math.PI) / 180);

    const speedMs = avgSpeedKmh / 3.6;
    let cumDist = 0;

    for (let i = 0; i < totalPoints; i++) {
        const t = i / totalPoints;

        // Simulate a realistic urban route: initial acceleration, cruise, braking
        const speedFactor =
            t < 0.1 ? t / 0.1 : // acceleration
                t > 0.9 ? (1 - t) / 0.1 : // deceleration
                    1.0 + 0.15 * Math.sin(i * 0.3); // cruising with small variations

        const currentSpeedMs = speedMs * Math.max(0.1, speedFactor);
        const currentSpeedKmh = currentSpeedMs * 3.6;

        const stepDist = currentSpeedMs * intervalSeconds;
        cumDist += stepDist;

        // Route: follows a curved path using sine wave for lat/lng offset
        const progress = cumDist;
        const angle = (progress / 1000) * 0.5; // gradual turn over 1km
        const dx = Math.cos(angle) * stepDist;
        const dy = Math.sin(angle) * stepDist;

        const lat = startLat + (progress * Math.sin(angle) * 0.5) / metersPerDegLat;
        const lng = startLng + (progress * Math.cos(angle) * 0.5) / metersPerDegLng;

        logs.push({
            lat: parseFloat(lat.toFixed(7)),
            lng: parseFloat(lng.toFixed(7)),
            speed: parseFloat(currentSpeedKmh.toFixed(1)),
            timestamp: new Date(startTime.getTime() + i * intervalSeconds * 1000),
        });
    }

    return logs;
}

function addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 3600000);
}

function addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 86400000);
}

async function main() {
    console.log('🌱 Starting database seed...\n');

    // ── Clear existing data ──
    await prisma.tripLog.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.user.deleteMany();

    const salt = 10;

    // ─────────────────────────────────────────────
    // Users
    // ─────────────────────────────────────────────
    console.log('👤 Creating users...');

    const adminUser = await prisma.user.create({
        data: {
            username: 'api_gpsdozor',
            password: await bcrypt.hash('yakmwlARdn', salt),
            role: Role.ADMIN,
        },
    });

    const driverPetr = await prisma.user.create({
        data: {
            username: 'pilot_petr',
            password: await bcrypt.hash('password123', salt),
            role: Role.DRIVER,
        },
    });

    const driverJana = await prisma.user.create({
        data: {
            username: 'pilot_jana',
            password: await bcrypt.hash('password123', salt),
            role: Role.DRIVER,
        },
    });

    const driverMarek = await prisma.user.create({
        data: {
            username: 'pilot_marek',
            password: await bcrypt.hash('password123', salt),
            role: Role.DRIVER,
        },
    });

    console.log(`  ✅ Created ${4} users (1 admin, 3 drivers)\n`);

    // ─────────────────────────────────────────────
    // Vehicles
    // ─────────────────────────────────────────────
    console.log('🚗 Creating fleet vehicles...');

    const vehicles = await prisma.vehicle.createManyAndReturn({
        data: [
            { name: 'BMW 740i', plate: '3A2 1000', status: VehicleStatus.ACTIVE, groupCode: 'EXEC' },
            { name: 'Škoda Octavia RS', plate: '1AB 2345', status: VehicleStatus.ACTIVE, groupCode: 'FLEET' },
            { name: 'Volkswagen Transporter', plate: '5C3 7890', status: VehicleStatus.ACTIVE, groupCode: 'FLEET' },
            { name: 'Audi A6', plate: '2D4 5678', status: VehicleStatus.ACTIVE, groupCode: 'EXEC' },
            { name: 'Mercedes Sprinter', plate: '4E5 4321', status: VehicleStatus.SERVICE, groupCode: 'FLEET' },
        ],
    });

    const [bmw, octavia, transporter, audi] = vehicles;
    console.log(`  ✅ Created ${vehicles.length} vehicles\n`);

    // ─────────────────────────────────────────────
    // Trips & TripLogs
    // ─────────────────────────────────────────────
    console.log('📍 Generating trip data with dense GPS logs...\n');

    // BASE: Prague coordinates
    const PRAGUE_LAT = 50.0755;
    const PRAGUE_LNG = 14.4378;

    // ── GHOST REFERENCE TRIP (pilot_petr, BMW 740i) ──
    // This is the "Gold Standard" trip that future runs race against.
    console.log('  🏆 Generating GHOST REFERENCE TRIP (BMW 740i, pilot_petr)...');
    const ghostTripStart = addDays(new Date('2026-02-01T07:00:00Z'), 0);
    const ghostDuration = 35 * 60; // 35 minutes
    const ghostLogs = generatePragueRoute(PRAGUE_LAT, PRAGUE_LNG, ghostTripStart, ghostDuration, 58);

    const ghostTrip = await prisma.trip.create({
        data: {
            vehicleId: bmw.id,
            driverId: driverPetr.id,
            startTime: ghostTripStart,
            endTime: new Date(ghostTripStart.getTime() + ghostDuration * 1000),
            distanceKm: parseFloat(((58 * ghostDuration) / 3600).toFixed(2)),
            fuelConsumption: 6.8,
            avgSpeed: 58.0,
            score: 95,
            rank: 'S',
            ecoEventsCount: 1,
        },
    });

    await prisma.tripLog.createMany({
        data: ghostLogs.map((log) => ({ ...log, tripId: ghostTrip.id })),
    });
    console.log(`     ✅ Ghost trip created with ${ghostLogs.length} GPS points (${(ghostDuration / 60).toFixed(0)} min)\n`);

    // ── REALITY TRIP 1 (pilot_petr, BMW 740i) — Recent, slightly SLOWER ──
    console.log('  🔵 Generating REALITY TRIP 1 (BMW 740i, pilot_petr, recent)...');
    const realityTrip1Start = addDays(new Date('2026-03-01T07:05:00Z'), 0);
    const reality1Duration = 38 * 60; // 38 minutes — 3 min slower
    const reality1Logs = generatePragueRoute(PRAGUE_LAT, PRAGUE_LNG, realityTrip1Start, reality1Duration, 52);

    const realityTrip1 = await prisma.trip.create({
        data: {
            vehicleId: bmw.id,
            driverId: driverPetr.id,
            startTime: realityTrip1Start,
            endTime: new Date(realityTrip1Start.getTime() + reality1Duration * 1000),
            distanceKm: parseFloat(((52 * reality1Duration) / 3600).toFixed(2)),
            fuelConsumption: 7.4,
            avgSpeed: 52.0,
            score: 78,
            rank: 'B',
            ecoEventsCount: 4,
        },
    });

    await prisma.tripLog.createMany({
        data: reality1Logs.map((log) => ({ ...log, tripId: realityTrip1.id })),
    });
    console.log(`     ✅ Reality trip 1 created with ${reality1Logs.length} GPS points\n`);

    // ── REALITY TRIP 2 (pilot_petr, BMW 740i) — Yesterday, slightly FASTER ──
    console.log('  🔵 Generating REALITY TRIP 2 (BMW 740i, pilot_petr, yesterday)...');
    const realityTrip2Start = addDays(new Date('2026-03-03T07:02:00Z'), 0);
    const reality2Duration = 33 * 60; // 33 minutes — 2 min faster!
    const reality2Logs = generatePragueRoute(PRAGUE_LAT + 0.002, PRAGUE_LNG + 0.001, realityTrip2Start, reality2Duration, 62);

    const realityTrip2 = await prisma.trip.create({
        data: {
            vehicleId: bmw.id,
            driverId: driverPetr.id,
            startTime: realityTrip2Start,
            endTime: new Date(realityTrip2Start.getTime() + reality2Duration * 1000),
            distanceKm: parseFloat(((62 * reality2Duration) / 3600).toFixed(2)),
            fuelConsumption: 6.2,
            avgSpeed: 62.0,
            score: 91,
            rank: 'A',
            ecoEventsCount: 2,
        },
    });

    await prisma.tripLog.createMany({
        data: reality2Logs.map((log) => ({ ...log, tripId: realityTrip2.id })),
    });
    console.log(`     ✅ Reality trip 2 created with ${reality2Logs.length} GPS points\n`);

    // ── Škoda Octavia trips for pilot_jana ──
    console.log('  🟢 Generating trips for Škoda Octavia (pilot_jana)...');
    for (let day = 0; day < 5; day++) {
        const tripStart = addDays(new Date('2026-02-25T08:00:00Z'), day);
        const duration = (28 + Math.random() * 10) * 60;
        const avgSpd = 45 + Math.random() * 20;
        const logs = generatePragueRoute(
            PRAGUE_LAT - 0.05 + day * 0.01,
            PRAGUE_LNG - 0.03 + day * 0.01,
            tripStart,
            Math.floor(duration),
            avgSpd,
        );

        const trip = await prisma.trip.create({
            data: {
                vehicleId: octavia.id,
                driverId: driverJana.id,
                startTime: tripStart,
                endTime: new Date(tripStart.getTime() + duration * 1000),
                distanceKm: parseFloat(((avgSpd * duration) / 3600000).toFixed(2)),
                fuelConsumption: parseFloat((5.5 + Math.random() * 1.5).toFixed(2)),
                avgSpeed: parseFloat(avgSpd.toFixed(1)),
                score: Math.floor(70 + Math.random() * 25),
                rank: ['A', 'B', 'B', 'C', 'A'][day],
                ecoEventsCount: Math.floor(Math.random() * 5),
            },
        });

        await prisma.tripLog.createMany({
            data: logs.map((log) => ({ ...log, tripId: trip.id })),
        });
    }
    console.log('     ✅ 5 Octavia trips with GPS logs created\n');

    // ── VW Transporter trips for pilot_marek ──
    console.log('  🟡 Generating trips for VW Transporter (pilot_marek)...');
    for (let day = 0; day < 3; day++) {
        const tripStart = addDays(new Date('2026-03-01T06:00:00Z'), day);
        const duration = (45 + Math.random() * 15) * 60;
        const avgSpd = 38 + Math.random() * 15;
        const logs = generatePragueRoute(
            PRAGUE_LAT + 0.08 + day * 0.005,
            PRAGUE_LNG + 0.04 + day * 0.005,
            tripStart,
            Math.floor(duration),
            avgSpd,
        );

        const trip = await prisma.trip.create({
            data: {
                vehicleId: transporter.id,
                driverId: driverMarek.id,
                startTime: tripStart,
                endTime: new Date(tripStart.getTime() + duration * 1000),
                distanceKm: parseFloat(((avgSpd * duration) / 3600000).toFixed(2)),
                fuelConsumption: parseFloat((9 + Math.random() * 2).toFixed(2)),
                avgSpeed: parseFloat(avgSpd.toFixed(1)),
                score: Math.floor(60 + Math.random() * 30),
                rank: ['B', 'C', 'A'][day],
                ecoEventsCount: Math.floor(Math.random() * 7),
            },
        });

        await prisma.tripLog.createMany({
            data: logs.map((log) => ({ ...log, tripId: trip.id })),
        });
    }
    console.log('     ✅ 3 Transporter trips with GPS logs created\n');

    // ─────────────────────────────────────────────
    // Summary
    // ─────────────────────────────────────────────
    const totalLogs = await prisma.tripLog.count();
    const totalTrips = await prisma.trip.count();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SEED COMPLETE');
    console.log(`   👤 Users: 4 (1 admin, 3 drivers)`);
    console.log(`   🚗 Vehicles: ${vehicles.length}`);
    console.log(`   📍 Trips: ${totalTrips}`);
    console.log(`   🗺️  TripLog points: ${totalLogs.toLocaleString()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🔑 Login Credentials:');
    console.log('   Admin:  api_gpsdozor / yakmwlARdn');
    console.log('   Driver: pilot_petr   / password123');
    console.log('   Driver: pilot_jana   / password123');
    console.log('   Driver: pilot_marek  / password123\n');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
