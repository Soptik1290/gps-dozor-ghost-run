const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// ─────────────────────────────────────────────
// GPS Track Generator — Prague city route
// ─────────────────────────────────────────────
function generatePragueRoute(startLat, startLng, startTime, durationSeconds, avgSpeedKmh) {
    const logs = [];
    const intervalSeconds = 1;
    const totalPoints = Math.floor(durationSeconds / intervalSeconds);

    const metersPerDegLat = 111320;
    const metersPerDegLng = 111320 * Math.cos((startLat * Math.PI) / 180);

    const speedMs = avgSpeedKmh / 3.6;
    let cumDist = 0;

    for (let i = 0; i < totalPoints; i++) {
        const t = i / totalPoints;
        const speedFactor = t < 0.1 ? t / 0.1 : t > 0.9 ? (1 - t) / 0.1 : 1.0 + 0.15 * Math.sin(i * 0.3);
        const currentSpeedMs = speedMs * Math.max(0.1, speedFactor);
        const currentSpeedKmh = currentSpeedMs * 3.6;

        const stepDist = currentSpeedMs * intervalSeconds;
        cumDist += stepDist;

        const progress = cumDist;
        const angle = (progress / 1000) * 0.5;

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

function addDays(date, days) {
    return new Date(date.getTime() + days * 86400000);
}

async function main() {
    console.log('🌱 Starting database seed via raw pg connection...\n');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
        // ── Clear existing data ──
        await client.query('DELETE FROM "TripLog"');
        await client.query('DELETE FROM "Trip"');
        await client.query('DELETE FROM "Vehicle"');
        await client.query('DELETE FROM "User"');

        const salt = 10;
        console.log('👤 Creating users...');

        // USERS
        const pwd = await bcrypt.hash('yakmwlARdn', salt);
        const pwdDriver = await bcrypt.hash('password123', salt);

        const adminRes = await client.query(`INSERT INTO "User" (username, password, role, "createdAt") VALUES ($1, $2, 'ADMIN', NOW()) RETURNING id`, ['api_gpsdozor', pwd]);
        const petrRes = await client.query(`INSERT INTO "User" (username, password, role, "createdAt") VALUES ($1, $2, 'DRIVER', NOW()) RETURNING id`, ['pilot_petr', pwdDriver]);
        const janaRes = await client.query(`INSERT INTO "User" (username, password, role, "createdAt") VALUES ($1, $2, 'DRIVER', NOW()) RETURNING id`, ['pilot_jana', pwdDriver]);
        const marekRes = await client.query(`INSERT INTO "User" (username, password, role, "createdAt") VALUES ($1, $2, 'DRIVER', NOW()) RETURNING id`, ['pilot_marek', pwdDriver]);

        const driverPetrId = petrRes.rows[0].id;
        const driverJanaId = janaRes.rows[0].id;
        const driverMarekId = marekRes.rows[0].id;

        console.log('🚗 Creating fleet vehicles...');

        const vehiclesData = [
            ['BMW 740i', '3A2 1000', 'ACTIVE', 'EXEC'],
            ['Škoda Octavia RS', '1AB 2345', 'ACTIVE', 'FLEET'],
            ['Volkswagen Transporter', '5C3 7890', 'ACTIVE', 'FLEET'],
            ['Audi A6', '2D4 5678', 'ACTIVE', 'EXEC'],
            ['Mercedes Sprinter', '4E5 4321', 'SERVICE', 'FLEET']
        ];

        const vehicles = [];
        for (const v of vehiclesData) {
            const res = await client.query(`INSERT INTO "Vehicle" (name, plate, status, "groupCode", "createdAt") VALUES ($1, $2, $3, $4, NOW()) RETURNING id`, v);
            vehicles.push({ id: res.rows[0].id, name: v[0] });
        }

        const bmwId = vehicles[0].id;
        const octaviaId = vehicles[1].id;
        const transporterId = vehicles[2].id;

        console.log('📍 Generating GHOST REFERENCE TRIP (BMW 740i, pilot_petr)...');

        const insertTrip = async (vId, dId, start, dur, dist, fuel, speed, score, rank, eco, startLat, startLng, endLat, endLng, destName) => {
            const res = await client.query(
                `INSERT INTO "Trip" ("vehicleId", "driverId", "startTime", "endTime", "distanceKm", "fuelConsumption", "avgSpeed", score, rank, "ecoEventsCount", "startLat", "startLng", "endLat", "endLng", "destinationName", "createdAt") 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW()) RETURNING id`,
                [vId, dId, start, new Date(start.getTime() + dur * 1000), dist, fuel, speed, score, rank, eco, startLat, startLng, endLat, endLng, destName]
            );
            return res.rows[0].id;
        };

        const insertLogs = async (tripId, logs) => {
            const values = [];
            const params = [];
            let i = 1;
            for (const log of logs) {
                values.push(`($${i++}, $${i++}, $${i++}, $${i++}, $${i++})`);
                params.push(tripId, log.lat, log.lng, log.speed, log.timestamp);

                if (values.length >= 1000) {
                    await client.query(`INSERT INTO "TripLog" ("tripId", lat, lng, speed, timestamp) VALUES ${values.join(',')}`, params);
                    values.length = 0;
                    params.length = 0;
                    i = 1;
                }
            }
            if (values.length > 0) {
                await client.query(`INSERT INTO "TripLog" ("tripId", lat, lng, speed, timestamp) VALUES ${values.join(',')}`, params);
            }
        };

        const PRAGUE_LAT = 50.0755;
        const PRAGUE_LNG = 14.4378;

        // GHOST 
        const ghostStart = addDays(new Date('2026-02-01T07:00:00Z'), 0);
        const ghostLogs = generatePragueRoute(PRAGUE_LAT, PRAGUE_LNG, ghostStart, 35 * 60, 58);
        const ghostId = await insertTrip(bmwId, driverPetrId, ghostStart, 35 * 60, 33.8, 6.8, 58.0, 95, 'S', 1, ghostLogs[0].lat, ghostLogs[0].lng, ghostLogs[ghostLogs.length - 1].lat, ghostLogs[ghostLogs.length - 1].lng, 'Prague Warehouse');
        await insertLogs(ghostId, ghostLogs);

        // REALITY 1
        const r1Start = addDays(new Date('2026-03-01T07:05:00Z'), 0);
        const r1Logs = generatePragueRoute(PRAGUE_LAT, PRAGUE_LNG, r1Start, 38 * 60, 52);
        const r1Id = await insertTrip(bmwId, driverPetrId, r1Start, 38 * 60, 32.9, 7.4, 52.0, 78, 'B', 4, r1Logs[0].lat, r1Logs[0].lng, r1Logs[r1Logs.length - 1].lat, r1Logs[r1Logs.length - 1].lng, 'Prague Warehouse');
        await insertLogs(r1Id, r1Logs);

        // REALITY 2
        const r2Start = addDays(new Date('2026-03-03T07:02:00Z'), 0);
        const r2Logs = generatePragueRoute(PRAGUE_LAT + 0.002, PRAGUE_LNG + 0.001, r2Start, 33 * 60, 62);
        const r2Id = await insertTrip(bmwId, driverPetrId, r2Start, 33 * 60, 34.1, 6.2, 62.0, 91, 'A', 2, r2Logs[0].lat, r2Logs[0].lng, r2Logs[r2Logs.length - 1].lat, r2Logs[r2Logs.length - 1].lng, 'Prague Warehouse');
        await insertLogs(r2Id, r2Logs);

        let totalTr = 3;
        console.log('  🟢 Generating trips for Škoda Octavia...');
        for (let day = 0; day < 5; day++) {
            const ts = addDays(new Date('2026-02-25T08:00:00Z'), day);
            const dur = (28 + Math.random() * 10) * 60;
            const spd = 45 + Math.random() * 20;
            const logs = generatePragueRoute(PRAGUE_LAT - 0.05 + day * 0.01, PRAGUE_LNG - 0.03 + day * 0.01, ts, dur, spd);
            const tid = await insertTrip(octaviaId, driverJanaId, ts, dur, (spd * dur) / 3600, 5.5, spd, 80, 'B', 2, logs[0].lat, logs[0].lng, logs[logs.length - 1].lat, logs[logs.length - 1].lng, 'Client Region ' + day);
            await insertLogs(tid, logs);
            totalTr++;
        }

        console.log('  🟡 Generating trips for VW Transporter...');
        for (let day = 0; day < 3; day++) {
            const ts = addDays(new Date('2026-03-01T06:00:00Z'), day);
            const dur = (45 + Math.random() * 15) * 60;
            const spd = 38 + Math.random() * 15;
            const logs = generatePragueRoute(PRAGUE_LAT + 0.08 + day * 0.005, PRAGUE_LNG + 0.04 + day * 0.005, ts, dur, spd);
            const tid = await insertTrip(transporterId, driverMarekId, ts, dur, (spd * dur) / 3600, 9.0, spd, 70, 'C', 5, logs[0].lat, logs[0].lng, logs[logs.length - 1].lat, logs[logs.length - 1].lng, 'Depot ' + day);
            await insertLogs(tid, logs);
            totalTr++;
        }

        console.log(`\n✅ SEED COMPLETE (Users: 4, Vehicles: 5, Trips: ${totalTr})`);
    } catch (e) {
        console.error('❌ Error during seed:', e);
    } finally {
        await client.end();
    }
}

main();
