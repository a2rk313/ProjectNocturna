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
app.use(express.static(path.join(__dirname, '..'))); // Serve frontend

// --- PROXY ENDPOINTS (FIXED) ---

// 1. Observatories Proxy
app.post('/api/proxy/overpass', async (req, res) => {
    try {
        const query = req.body.query;
        if (!query) throw new Error("Missing query");

        // Format data as form-urlencoded
        const params = new URLSearchParams();
        params.append('data', query);

        const response = await axios.post('https://overpass-api.de/api/interpreter', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 15000
        });
        res.json(response.data);
    } catch (error) {
        console.error("Overpass Error:", error.message);
        res.status(500).json({ error: "Proxy Failed" });
    }
});

// 2. Weather Proxy
app.get('/api/proxy/weather', async (req, res) => {
    try {
        const { lat, lng } = req.query;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=cloud_cover,rain&daily=sunrise,sunset&timezone=auto`;
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        console.error("Weather Error:", error.message);
        res.status(500).json({ error: "Weather API Failed" });
    }
});

// --- DATABASE CONNECTION ---
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'nocturna',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

app.get('/api/stations', async (req, res) => {
    try {
        const result = await pool.query('SELECT lat, lng, sqm, mag, date_observed FROM measurements LIMIT 1000');
        res.json(result.rows);
    } catch (err) {
        // Return empty array instead of error to keep frontend alive
        res.json([]); 
    }
});

app.get('/api/measurement', async (req, res) => {
    try {
        const { lat, lng } = req.query;
        const query = `
            SELECT id, lat, lng, elevation, date_observed, sqm, mag, constellation, comment,
                   ST_Distance(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000 as distance_km
            FROM measurements
            ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326) LIMIT 1;`;
        const result = await pool.query(query, [lng, lat]);
        res.json(result.rows[0] || {});
    } catch (err) {
        res.status(500).json({ error: "DB Error" });
    }
});

// Export seed function for startup scripts
module.exports = { seedDatabase: async () => { console.log("Seeding placeholder..."); } }; 

if (require.main === module) {
    app.listen(port, () => console.log(`🚀 Server running on http://localhost:${port}`));
}