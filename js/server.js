require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const axios = require('axios');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Serve static files (Frontend)
const projectRoot = path.join(__dirname, '..');
app.use(express.static(projectRoot));

app.get('/favicon.ico', (req, res) => res.sendFile(path.join(projectRoot, 'images', 'logo.png')));

// --- DATABASE CONNECTION ---
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'nocturna',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

// Helper for cleaning CSV data
const safeFloat = (val) => {
    if (val === "" || val === null || val === undefined) return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
};

// --- NEW PROXY ENDPOINTS (Solves CORS & Architecture) ---

// 1. Overpass API Proxy (Observatories/Infrastructure)
app.post('/api/proxy/overpass', async (req, res) => {
    try {
        const query = req.body.query;
        // The server calls the API, protecting keys and bypassing CORS
        const response = await axios.post('https://overpass-api.de/api/interpreter', query, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        res.json(response.data);
    } catch (error) {
        console.error("Overpass Proxy Error:", error.message);
        res.status(500).json({ error: "Failed to fetch from Overpass API" });
    }
});

// 2. Weather Proxy (Open-Meteo)
app.get('/api/proxy/weather', async (req, res) => {
    const { lat, lng } = req.query;
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=cloud_cover,rain&daily=sunrise,sunset&timezone=auto`;
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        console.error("Weather Proxy Error:", error.message);
        res.status(500).json({ error: "Weather API Failed" });
    }
});

// --- EXISTING DATABASE ENDPOINTS ---

app.get('/api/measurement', async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: "Missing lat/lng" });

    try {
        // Find nearest measurement
        const query = `
            SELECT id, lat, lng, elevation, date_observed, sqm, mag, constellation, comment,
                   ST_Distance(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000 as distance_km
            FROM measurements
            ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
            LIMIT 1;
        `;
        const result = await pool.query(query, [lng, lat]);
        
        if (result.rows.length > 0) res.json(result.rows[0]);
        else res.status(404).json({ error: 'No data found' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/stations', async (req, res) => {
    try {
        const query = `SELECT lat, lng, sqm, mag, date_observed FROM measurements WHERE sqm IS NOT NULL LIMIT 1000;`;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// --- SEEDING LOGIC ---
app.get('/seed-db', (req, res) => {
    seedDatabase().then(msg => res.send(msg)).catch(err => res.status(500).send(err));
});

async function seedDatabase() {
    const results = [];
    const filePath = path.join(projectRoot, 'data', 'GaN2024.csv');

    if (!fs.existsSync(filePath)) throw "CSV file not found in /data folder.";

    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                let client;
                try {
                    client = await pool.connect();
                    await client.query('BEGIN');
                    await client.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);
                    await client.query(`
                        CREATE TABLE IF NOT EXISTS measurements (
                            id SERIAL PRIMARY KEY,
                            lat FLOAT, lng FLOAT, elevation NUMERIC,
                            date_observed VARCHAR(50), sqm NUMERIC, mag NUMERIC,
                            constellation VARCHAR(50), comment TEXT, geom GEOMETRY(POINT, 4326)
                        );
                        CREATE INDEX IF NOT EXISTS idx_measurements_geom ON measurements USING GIST (geom);
                    `);
                    await client.query('TRUNCATE TABLE measurements RESTART IDENTITY;');

                    let count = 0;
                    for (const row of results) {
                        const lat = safeFloat(row['Latitude']); 
                        const lng = safeFloat(row['Longitude']);
                        if(lat !== null && lng !== null) {
                            await client.query(
                                `INSERT INTO measurements (lat, lng, elevation, date_observed, sqm, mag, constellation, comment, geom)
                                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ST_SetSRID(ST_MakePoint($2, $1), 4326))`,
                                [lat, lng, safeFloat(row['Elevation(m)']), row['LocalDate'], safeFloat(row['SQMReading']), safeFloat(row['LimitingMag']), row['Constellation'], row['SkyComment']]
                            );
                            count++;
                        }
                    }
                    await client.query('COMMIT');
                    const msg = `✅ Automatically seeded ${count} rows into PostGIS.`;
                    console.log(msg);
                    resolve(msg);
                } catch (e) {
                    if (client) await client.query('ROLLBACK');
                    console.error("Seeding Error:", e);
                    reject("Error seeding DB: " + e.toString());
                } finally {
                    if (client) client.release();
                }
            });
    });
}

// Export for command line usage
module.exports = { seedDatabase };

// Start Server
if (require.main === module) {
    app.listen(port, () => {
        console.log(`\n🚀 Project Nocturna Containerized Server Running!`);
        console.log(`👉 App URL: http://localhost:${port}/mode-selection.html`);
    });
}