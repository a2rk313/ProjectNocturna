// js/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const axios = require('axios');
const { processVIIRSData } = require('./viirs-processor');

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const allowedOrigins = [process.env.ALLOWED_ORIGIN || 'http://localhost:8081', 'http://localhost:3000', 'http://127.0.0.1:3000'];
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..')));

// --- DATABASE CONNECTION ---
if (!process.env.DB_PASSWORD && process.env.NODE_ENV === 'production') {
    console.error("❌ Fatal Error: DB_PASSWORD is not set in production environment.");
    process.exit(1);
}

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'nocturna',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

const safeQuery = async (query, params = []) => {
    try { return await pool.query(query, params); } 
    catch (error) { console.error('DB Error:', error.message); throw error; }
};

// --- DATA QUALITY HELPERS ---

function getMoonIllumination(date) {
    const synodic = 29.53058867; 
    const knownNewMoon = new Date('2000-01-06T18:14:00Z');
    const diffDays = (date - knownNewMoon) / (1000 * 60 * 60 * 24);
    // Ensure positive modulo for correct phase calculation
    const phase = ((diffDays % synodic) + synodic) % synodic / synodic;
    const angle = phase * 2 * Math.PI;
    return (1 - Math.cos(angle)) / 2;
}

function parseCloudCover(text) {
    if (!text) return 100; 
    const t = text.toLowerCase().trim();

    // Handle percentage values
    const percentMatch = t.match(/(\d+)%/);
    if (percentMatch) {
        return parseInt(percentMatch[1]);
    }

    // Handle fraction values
    if (t.includes('clear') || t.includes('sunny') || t.includes('0/8') || t.includes('0 oktas')) return 0;
    if (t.includes('few') || t.includes('1/8') || t.includes('1 okta') || t.includes('1-2 oktas')) return 12;
    if (t.includes('scattered') || t.includes('3/8') || t.includes('3-4 oktas')) return 37;
    if (t.includes('broken') || t.includes('5/8') || t.includes('5-7 oktas')) return 75;
    if (t.includes('overcast') || t.includes('8/8') || t.includes('8 oktas') || t.includes('100%')) return 100;
    if (t.includes('mostly cloudy') || t.includes('7/8')) return 87;
    if (t.includes('partly cloudy') || t.includes('partly sunny') || t.includes('2/8') || t.includes('4/8')) return 25;

    // Handle numeric ranges
    const rangeMatch = t.match(/(\d+)\s*-\s*(\d+)/);
    if (rangeMatch) {
        const avg = (parseInt(rangeMatch[1]) + parseInt(rangeMatch[2])) / 2;
        return Math.min(100, Math.max(0, avg));
    }

    // Original basic checks as fallback (preserved order from fix)
    if (t.includes('1/4')) return 25;
    if (t.includes('over 1/2')) return 75;
    if (t.includes('1/2')) return 50;

    // Default fallback
    return 50;
}

// --- API ENDPOINTS ---

app.get('/api/stations', async (req, res) => {
    try {
        const result = await safeQuery('SELECT lat, lng, sqm, mag, date_observed, is_research_grade FROM measurements LIMIT 2000');
        res.json(result.rows);
    } catch (err) { res.json([]); }
});

app.get('/api/measurement', async (req, res) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) return res.status(400).json({ error: "Missing params" });

        const query = `
            SELECT id, lat, lng, elevation, date_observed, sqm, mag, constellation, comment, is_research_grade, quality_score,
                   ST_Distance(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000 as distance_km
            FROM measurements
            ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326) LIMIT 1;`;
        const result = await safeQuery(query, [lng, lat]);
        res.json(result.rows[0] || {});
    } catch (err) { res.status(500).json({ error: "DB Error" }); }
});

// 1. STATISTICAL ANALYSIS (With Research Filter)
app.post('/api/stats', async (req, res) => {
    try {
        const { geometry, researchMode } = req.body;
        if (!geometry) return res.status(400).json({ error: "Missing geometry" });

        let query = `
            SELECT 
                ROUND(AVG(sqm)::numeric, 2) as avg_brightness,
                COUNT(*) as sample_size,
                MIN(sqm) as worst_point,
                MAX(sqm) as best_point,
                ROUND(AVG(quality_score)::numeric, 0) as avg_quality
            FROM measurements
            WHERE ST_Contains(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326), geom)
        `;

        if (researchMode) {
            query += ` AND is_research_grade = TRUE`;
        }

        const result = await safeQuery(query, [JSON.stringify(geometry)]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Stats Error:", err);
        res.status(500).json({ error: "Analysis failed" });
    }
});

// 2. NEW: HISTORICAL TIME SERIES
app.get('/api/history', async (req, res) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) return res.status(400).json({ error: "Missing coordinates" });
        
        // Find measurements within 5km, ordered by date
        const query = `
            SELECT date_observed, sqm 
            FROM measurements 
            WHERE ST_DWithin(
                geom::geography, 
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 
                5000
            )
            AND sqm IS NOT NULL
            ORDER BY date_observed ASC
        `;
        const result = await safeQuery(query, [lng, lat]);
        res.json(result.rows);
    } catch (err) {
        console.error("History Error:", err);
        res.status(500).json({ error: "Failed to fetch history" });
    }
});

// 3. NEW: PHYSICS-BASED ENERGY ANALYSIS
app.post('/api/analyze-energy', async (req, res) => {
    try {
        const { geometry, costPerKwh, uloRatio } = req.body;
        if (!geometry || !geometry.type || !geometry.coordinates) {
             return res.status(400).json({ error: "Invalid geometry" });
        }
        
        // Get average brightness and real area size
        const query = `
            SELECT 
                AVG(sqm) as avg_sqm,
                ST_Area(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)::geography) as area_sqm
            FROM measurements
            WHERE ST_Contains(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326), geom)
        `;
        const result = await safeQuery(query, [JSON.stringify(geometry)]);
        
        // If no data found, return null or appropriate message instead of misleading default
        if (result.rows.length === 0 || result.rows[0].avg_sqm === null) {
             return res.json({
                sqm: "N/A",
                luminance: 0,
                annual_kwh: 0,
                annual_cost: 0,
                area_km2: (result.rows[0]?.area_sqm || 0) / 1000000,
                message: "No measurement data available for this region."
             });
        }

        const avgSQM = result.rows[0].avg_sqm;
        const areaM2 = result.rows[0].area_sqm || 0;

        // Custom Physics Parameters
        const kwhPrice = parseFloat(costPerKwh) || 0.15;
        const ulo = parseFloat(uloRatio) || 0.2;

        // PHYSICS FORMULA: SQM (mag/arcsec²) -> Luminance (cd/m²)
        // L = 10.8e4 * 10^(-0.4 * SQM)
        const luminance = 10.8 * 10000 * Math.pow(10, -0.4 * avgSQM);

        // ESTIMATION: 
        // Upward Light Output (ULO) per cd/m² of luminance
        const wastedWattsPerMeter = luminance * ulo;
        const totalWastedKw = (wastedWattsPerMeter * areaM2) / 1000;
        
        const annualKwh = totalWastedKw * 365 * 10; // 10 hours darkness
        const cost = annualKwh * kwhPrice;

        res.json({
            sqm: parseFloat(avgSQM).toFixed(2),
            luminance: luminance.toExponential(2),
            annual_kwh: Math.round(annualKwh),
            annual_cost: Math.round(cost),
            area_km2: (areaM2 / 1000000).toFixed(2),
            params: { kwhPrice, ulo }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Physics calculation failed" });
    }
});

// Proxy Endpoints
app.post('/api/proxy/overpass', async (req, res) => {
    try {
        const { type, lat, lng, radius } = req.body;

        let query = '';
        if (type === 'observatories') {
             if (!lat || !lng) return res.status(400).json({ error: "Missing coordinates" });
             const r = parseInt(radius) || 50000;
             query = `[out:json][timeout:25];
                (
                  node["amenity"="observatory"](around:${r}, ${lat}, ${lng});
                  way["amenity"="observatory"](around:${r}, ${lat}, ${lng});
                  relation["amenity"="observatory"](around:${r}, ${lat}, ${lng});
                );
                out center;`;
        } else {
            return res.status(400).json({ error: "Invalid query type" });
        }

        const response = await axios.post('https://overpass-api.de/api/interpreter', `data=${query}`);
        res.json(response.data);
    } catch (e) {
        console.error("Overpass Error:", e.message);
        res.status(500).json({ error: "Overpass failed" });
    }
});

app.get('/api/system/n8n-status', async (req, res) => {
    try {
        const n8nUrl = process.env.N8N_URL || 'http://localhost:5678';
        const response = await axios.get(`${n8nUrl}/healthz`, { timeout: 2000 });
        res.json({ online: response.status === 200 });
    } catch (e) {
        res.json({ online: false });
    }
});

app.get('/api/proxy/weather', async (req, res) => {
    try {
        const { lat, lng } = req.query;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=cloud_cover,temperature_2m,wind_speed_10m`;
        const response = await axios.get(url);
        res.json(response.data);
    } catch (e) { res.status(500).json({ error: "Weather failed" }); }
});

// --- VIIRS DATA PROCESSING ---

// Function to fetch VIIRS data from NASA Earthdata API or local files
// Now handled by viirs-processor.js

// API endpoint to get VIIRS data for a specific area
app.get('/api/viirs-data', async (req, res) => {
    try {
        const { lat, lng, radius = 50 } = req.query; // radius in km
        
        if (!lat || !lng) {
            return res.status(400).json({ error: "Missing coordinates" });
        }

        const query = `
            SELECT id, ST_X(ST_Centroid(geom)) as lng, ST_Y(ST_Centroid(geom)) as lat, 
                   radiance_avg, acquisition_date
            FROM viirs_data
            WHERE ST_DWithin(
                geom::geography, 
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 
                $3
            )
            ORDER BY radiance_avg DESC
        `;
        
        const result = await safeQuery(query, [parseFloat(lng), parseFloat(lat), parseInt(radius) * 1000]);
        res.json(result.rows);
    } catch (err) {
        console.error("VIIRS API Error:", err);
        res.status(500).json({ error: "Failed to fetch VIIRS data" });
    }
});

// API endpoint to get aggregated VIIRS statistics for a polygon area
app.post('/api/viirs-stats', async (req, res) => {
    try {
        const { geometry } = req.body;
        if (!geometry) return res.status(400).json({ error: "Missing geometry" });

        const query = `
            SELECT 
                AVG(radiance_avg) as avg_radiance,
                COUNT(*) as tile_count,
                MIN(acquisition_date) as min_date,
                MAX(acquisition_date) as max_date
            FROM viirs_data
            WHERE ST_Intersects(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326), geom)
        `;
        
        const result = await safeQuery(query, [JSON.stringify(geometry)]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error("VIIRS Stats Error:", err);
        res.status(500).json({ error: "Failed to calculate VIIRS stats" });
    }
});

// --- SEEDING LOGIC ---
async function seedDatabase() {
    console.log("🌱 Starting Research-Grade Data Ingestion...");
    try {
        const count = await pool.query('SELECT COUNT(*) FROM measurements');
        if (parseInt(count.rows[0].count) > 0) {
            console.log("✅ Database populated. Skipping seed.");
            return;
        }

        let inserted = 0;
        let skipped = 0;

        // Use async iterator to process stream line-by-line without buffering entirely
        const stream = fs.createReadStream(path.join(__dirname, '../data/GaN2024.csv'))
            .pipe(csv());

        const batchSize = 500;
        let batch = [];

        const flushBatch = async () => {
            if (batch.length === 0) return;

            const values = [];
            const valueStrings = [];
            let counter = 1;

            for (const r of batch) {
                values.push(...r);
                const p = (i) => `$${counter + i}`;
                // params: lat, lng, elev, date, sqm, mag, const, comm, cloud, moon, grade, score
                // geom: ST_SetSRID(ST_MakePoint(lng, lat), 4326) => p(1), p(0)
                valueStrings.push(`(${p(0)}, ${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${p(6)}, ${p(7)}, ${p(8)}, ${p(9)}, ${p(10)}, ${p(11)}, ST_SetSRID(ST_MakePoint(${p(1)}, ${p(0)}), 4326))`);
                counter += 12;
            }

            const query = `
                INSERT INTO measurements
                (lat, lng, elevation, date_observed, sqm, mag, constellation, comment, cloud_cover_pct, moon_illumination, is_research_grade, quality_score, geom)
                VALUES ${valueStrings.join(', ')}
            `;

            try {
                await pool.query(query, values);
                inserted += batch.length;
            } catch (e) {
                console.error("Batch insert failed:", e);
                skipped += batch.length;
            }
            batch = [];
        };

        for await (const row of stream) {
            const lat = parseFloat(row.Latitude);
            const lng = parseFloat(row.Longitude);
            const sqm = parseFloat(row.SQMReading);

            if (isNaN(lat) || isNaN(lng) || isNaN(sqm) || sqm < 14 || sqm > 24) {
                skipped++; continue;
            }

            let dateStr = row.UTDate;
            if(row.UTTime) dateStr += 'T' + row.UTTime;
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) { skipped++; continue; }

            const moonIllum = getMoonIllumination(date);
            const cloudPct = parseCloudCover(row.CloudCover);
            const isResearchGrade = (cloudPct <= 25 && moonIllum < 0.20 && sqm > 16.0);

            let score = 100;
            if (cloudPct > 0) score -= cloudPct;
            if (moonIllum > 0.1) score -= (moonIllum * 50);
            if (!row.SQMSerial) score -= 10;
            if (score < 0) score = 0;

            batch.push([lat, lng, row['Elevation(m)'], date, sqm, row.LimitingMag, row.Constellation, row.SkyComment, cloudPct, moonIllum, isResearchGrade, score]);

            if (batch.length >= batchSize) {
                await flushBatch();
            }
        }
        await flushBatch();
        console.log(`✅ Ingestion Complete. Inserted: ${inserted}, Skipped: ${skipped}`);
    } catch (e) { console.error("Seeding failed:", e); }
}

app.post('/api/seed-db', async (req, res) => { await seedDatabase(); res.json({status: 'done'}); });

if (require.main === module) {
    app.listen(port, () => {
        console.log(`🚀 Server running on port ${port}`);
        seedDatabase();
        processVIIRSData();  // Load VIIRS data after seeding
    });
}

module.exports = { seedDatabase, getMoonIllumination, parseCloudCover, app };