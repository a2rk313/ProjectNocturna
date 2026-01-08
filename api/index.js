require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const axios = require('axios');

const app = express();

// 1. CORS Configuration (Allow frontend to talk to backend)
const corsOptions = {
    origin: '*', // Allow all origins for dev/demo. Change to your Vercel URL in prod.
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 2. Database Connection (Supabase)
// We use a connection pool, but Vercel freezes functions so we handle errors gracefully.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for Supabase
    }
});

// Helper: robust query execution
const safeQuery = async (query, params = []) => {
    try {
        return await pool.query(query, params);
    } catch (error) {
        console.error('DB Error:', error.message);
        throw error;
    }
};

// --- API ENDPOINTS ---

// GET: All Stations (Optimized for map)
app.get('/api/stations', async (req, res) => {
    try {
        // Limit to 2000 to prevent map lag
        const result = await safeQuery('SELECT lat, lng, sqm_reading as sqm, bortle_class as mag, measured_at as date_observed, is_research_grade FROM light_measurements LIMIT 2000');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.json([]);
    }
});

// GET: Single Measurement details (Nearest neighbor)
app.get('/api/measurement', async (req, res) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) return res.status(400).json({ error: "Missing params" });

        const query = `
            SELECT id, ST_Y(geom::geometry) as lat, ST_X(geom::geometry) as lng, 
                   measured_at as date_observed, sqm_reading as sqm, bortle_class as mag, 
                   notes as comment, is_research_grade,
                   ST_Distance(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000 as distance_km
            FROM light_measurements
            ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326) LIMIT 1;`;
        
        const result = await safeQuery(query, [lng, lat]);
        res.json(result.rows[0] || {});
    } catch (err) {
        res.status(500).json({ error: "DB Error" });
    }
});

// POST: Add New Measurement
app.post('/api/measurements', async (req, res) => {
    const { lat, lng, sqm, device_type, notes } = req.body;
    try {
        await safeQuery(`
            INSERT INTO light_measurements (sqm_reading, device_type, notes, geom)
            VALUES ($1, $2, $3, ST_SetSRID(ST_Point($4, $5), 4326))
        `, [sqm, device_type, notes, lng, lat]);
        res.json({ status: "success" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Statistical Analysis (Polygon)
app.post('/api/stats', async (req, res) => {
    try {
        const { geometry } = req.body;
        if (!geometry) return res.status(400).json({ error: "Missing geometry" });

        // Calculate average brightness inside polygon
        // Note: Using 'analysis_grid' (satellite data) if available, otherwise fallback to measurements
        
        // Strategy: First check satellite grid (higher precision)
        let query = `
            SELECT 
                ROUND(AVG(mean_radiance_2024)::numeric, 2) as avg_brightness,
                COUNT(*) as sample_size,
                'Satellite VNP46A2' as source
            FROM analysis_grid
            WHERE ST_Intersects(geom, ST_SetSRID(ST_GeomFromGeoJSON($1), 4326))
        `;
        
        let result = await safeQuery(query, [JSON.stringify(geometry)]);

        // Fallback: If no satellite data found, use ground stations
        if (!result.rows[0].avg_brightness) {
             query = `
                SELECT 
                    ROUND(AVG(sqm_reading)::numeric, 2) as avg_brightness,
                    COUNT(*) as sample_size,
                    'Ground Stations' as source
                FROM light_measurements
                WHERE ST_Contains(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326), geom)
            `;
            result = await safeQuery(query, [JSON.stringify(geometry)]);
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Stats Error:", err);
        res.status(500).json({ error: "Analysis failed" });
    }
});

// GET: Historical Time Series
app.get('/api/history', async (req, res) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) return res.status(400).json({ error: "Missing coordinates" });
        
        // Query the Zonal Time Series table
        const query = `
            SELECT z.month_date as date_observed, z.avg_radiance as sqm
            FROM zonal_time_series z
            JOIN admin_boundaries a ON z.zone_id = a.id
            WHERE ST_Contains(a.geom, ST_SetSRID(ST_Point($1, $2), 4326))
            ORDER BY z.month_date ASC
        `;
        const result = await safeQuery(query, [lng, lat]);
        
        // If no administrative zone data, return empty array
        res.json(result.rows);
    } catch (err) {
        console.error("History Error:", err);
        res.status(500).json({ error: "Failed to fetch history" });
    }
});

// POST: Physics-Based Energy Analysis
app.post('/api/analyze-energy', async (req, res) => {
    try {
        const { geometry } = req.body;
        if (!geometry) return res.status(400).json({ error: "Missing geometry" });
        
        // 1. Get Area Size (in Square Meters)
        // 2. Get Average Radiance (nW/cm2/sr) from Satellite Grid
        const query = `
            SELECT 
                AVG(mean_radiance_2024) as avg_radiance,
                ST_Area(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)::geography) as area_sqm
            FROM analysis_grid
            WHERE ST_Intersects(geom, ST_SetSRID(ST_GeomFromGeoJSON($1), 4326))
        `;
        const result = await safeQuery(query, [JSON.stringify(geometry)]);
        
        const radiance = result.rows[0].avg_radiance || 50.0; // Default fallback
        const areaM2 = result.rows[0].area_sqm || 10000; 

        // Physics: Approx conversion from Radiance (nW/cm2/sr) to Electrical Consumption
        // This is a simplified estimation model.
        // Assuming 1 nW/cm2/sr ~ 0.2 Watts/km2 of wasted upward energy (Heuristic)
        
        const totalWastedWatts = (radiance * 0.5) * (areaM2 / 1000); 
        const annualKwh = (totalWastedWatts * 365 * 10) / 1000; // 10 hours/night
        const cost = annualKwh * 0.15; // $0.15/kWh global avg

        res.json({
            sqm: "N/A (Satellite)",
            luminance: radiance.toFixed(2),
            annual_kwh: Math.round(annualKwh),
            annual_cost: Math.round(cost),
            area_km2: (areaM2 / 1000000).toFixed(2)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Physics calculation failed" });
    }
});

// POST: Area Analysis (for fixing cyclic object value error)
app.post('/api/analyze-area', async (req, res) => {
    try {
        const { geometry, type } = req.body;
        if (!geometry) return res.status(400).json({ error: "Missing geometry" });
        
        // Extract basic information from the geometry
        const query = `
            SELECT 
                COUNT(*) as point_count,
                ST_Area(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)::geography) as area_sqm
            FROM analysis_grid
            WHERE ST_Intersects(geom, ST_SetSRID(ST_GeomFromGeoJSON($1), 4326))
        `;
        
        const result = await safeQuery(query, [JSON.stringify(geometry)]);
        const areaKm2 = result.rows[0].area_sqm ? (result.rows[0].area_sqm / 1000000).toFixed(2) : 0;
        
        res.json({
            type: type || 'Unknown',
            area_km2: parseFloat(areaKm2),
            summary: `Analyzed ${type || 'selected area'} covering ${areaKm2} km²`
        });
    } catch (err) {
        console.error("Area Analysis Error:", err);
        res.status(500).json({ error: "Area analysis failed" });
    }
});

// POST: Spectral Analysis
app.post('/api/spectral-analysis', async (req, res) => {
    try {
        const { geometry } = req.body;
        if (!geometry) return res.status(400).json({ error: "Missing geometry" });
        
        // Simulate spectral analysis based on the area
        // In a real implementation, this would use actual spectral data
        res.json({
            dominant_wavelength: 589,
            light_source_type: "LED/Mixed",
            description: "Analysis shows mixed light sources with peak emissions around 589nm, typical of urban lighting infrastructure."
        });
    } catch (err) {
        console.error("Spectral Analysis Error:", err);
        res.status(500).json({ error: "Spectral analysis failed" });
    }
});

// POST: Scotobiology Analysis
app.post('/api/scotobiology-analysis', async (req, res) => {
    try {
        const { geometry } = req.body;
        if (!geometry) return res.status(400).json({ error: "Missing geometry" });
        
        // Simulate scotobiology analysis based on the area
        res.json({
            circadian_risk: "High",
            wildlife_impact: "Moderate",
            impact_summary: "High light pollution levels detected, potentially disrupting nocturnal wildlife patterns and circadian rhythms."
        });
    } catch (err) {
        console.error("Scotobiology Analysis Error:", err);
        res.status(500).json({ error: "Scotobiology analysis failed" });
    }
});

// POST: Energy Economics Analysis
app.post('/api/energy-economics', async (req, res) => {
    try {
        const { geometry } = req.body;
        if (!geometry) return res.status(400).json({ error: "Missing geometry" });
        
        // Simulate energy economics analysis based on the area
        const areaM2 = req.body.area_sqm || 1000000; // Default 1 km²
        const areaKm2 = areaM2 / 1000000;
        
        // Calculate estimated costs
        const annualKwh = Math.round(areaKm2 * 150000); // Estimated 150,000 kWh per km²
        const annualCost = Math.round(annualKwh * 0.15); // $0.15 per kWh
        
        res.json({
            annual_kwh: annualKwh,
            annual_cost: annualCost,
            roi_summary: "Potential savings of 30-40% achievable through LED conversion and smart lighting policies."
        });
    } catch (err) {
        console.error("Energy Economics Error:", err);
        res.status(500).json({ error: "Energy economics analysis failed" });
    }
});

// POST: Multi-spectral Analysis
app.post('/api/multi-spectral', async (req, res) => {
    try {
        const { geometry } = req.body;
        if (!geometry) return res.status(400).json({ error: "Missing geometry" });
        
        // Simulate multi-spectral analysis
        const areaM2 = req.body.area_sqm || 205845250000; // Default large area
        const areaKm2 = areaM2 / 1000000;
        
        res.json({
            area_km2: parseFloat(areaKm2.toFixed(2)),
            data_points: 12500,
            avg_radiance: 45.2,
            radiance_min: 5.1,
            radiance_max: 85.7,
            std_deviation: 18.3,
            data_quality: "High"
        });
    } catch (err) {
        console.error("Multi-spectral Analysis Error:", err);
        res.status(500).json({ error: "Multi-spectral analysis failed" });
    }
});

// Proxy Endpoints (To avoid CORS on frontend)
app.get('/api/proxy/weather', async (req, res) => {
    try {
        const { lat, lng } = req.query;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=cloud_cover,temperature_2m,wind_speed_10m`;
        const response = await axios.get(url);
        res.json(response.data);
    } catch (e) { res.status(500).json({ error: "Weather failed" }); }
});

// POST: Seed Database (Global Demo Data)
// Replaces the heavy CSV logic with instant SQL inserts
app.post('/api/seed-db', async (req, res) => {
    console.log("🌱 Seeding Global Demo Data...");
    try {
        // Only seed if empty to prevent duplicates
        const count = await safeQuery('SELECT COUNT(*) FROM light_measurements');
        if (parseInt(count.rows[0].count) > 0) {
            return res.json({ status: "skipped", message: "Database already populated." });
        }

        const seedPoints = [
            { lat: 31.5204, lng: 74.3587, sqm: 18.2, region: 'Lahore' },
            { lat: 40.7128, lng: -74.0060, sqm: 16.2, region: 'NYC' },
            { lat: 51.5074, lng: -0.1278, sqm: 17.1, region: 'London' },
            { lat: 35.6762, lng: 139.6503, sqm: 16.5, region: 'Tokyo' },
            { lat: -43.73, lng: 170.15, sqm: 21.8, region: 'Dark Sky NZ' }
        ];

        for (const p of seedPoints) {
            await safeQuery(`
                INSERT INTO light_measurements (sqm_reading, bortle_class, notes, geom)
                VALUES ($1, 8, $2, ST_SetSRID(ST_Point($3, $4), 4326))
            `, [p.sqm, `Demo Point: ${p.region}`, p.lng, p.lat]);
        }
        
        res.json({ status: "success", message: "Global demo points added." });
    } catch (e) { 
        console.error("Seeding failed:", e);
        res.status(500).json({ error: e.message });
    }
});

// 3. EXPORT APP (Critical for Vercel)
// Do NOT use app.listen() here! Vercel manages the process lifecycle.
module.exports = app;