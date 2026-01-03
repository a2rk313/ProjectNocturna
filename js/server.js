require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// Enhanced CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            process.env.ALLOWED_ORIGIN || 'http://localhost:8081',
            'http://localhost:8081',
            'http://127.0.0.1:8081'
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// --- PROXY ENDPOINTS (FIXED) ---

// 1. Observatories Proxy
app.post('/api/proxy/overpass', async (req, res) => {
    try {
        const query = req.body.query;
        if (!query) {
            return res.status(400).json({ error: "Missing query parameter" });
        }

        console.log('🔭 Overpass query:', query.substring(0, 100) + '...');

        // Format data as form-urlencoded
        const params = new URLSearchParams();
        params.append('data', query);

        const response = await axios.post('https://overpass-api.de/api/interpreter', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 15000,
            validateStatus: function (status) {
                return status >= 200 && status < 300; // Accept only 2xx status codes
            }
        });

        console.log('✅ Overpass response:', response.data.elements?.length || 0, 'elements');
        res.json(response.data);
    } catch (error) {
        console.error("❌ Overpass Error:", error.message);
        if (error.code === 'ECONNABORTED') {
            res.status(408).json({ error: "Request timeout. Overpass API may be busy." });
        } else if (error.response) {
            res.status(error.response.status).json({ 
                error: `Overpass API error: ${error.response.status}`,
                details: error.response.data 
            });
        } else {
            res.status(500).json({ error: "Proxy service unavailable" });
        }
    }
});

// 2. Weather Proxy
app.get('/api/proxy/weather', async (req, res) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ error: "Missing lat/lng parameters" });
        }

        console.log('🌤️ Weather request for:', lat, lng);

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}¤t=cloud_cover,rain,temperature_2m,wind_speed_10m&daily=sunrise,sunset&timezone=auto`;
        const response = await axios.get(url, {
            timeout: 10000,
            validateStatus: function (status) {
                return status >= 200 && status < 300;
            }
        });

        console.log('✅ Weather response received');
        res.json(response.data);
    } catch (error) {
        console.error("❌ Weather Error:", error.message);
        if (error.code === 'ECONNABORTED') {
            res.status(408).json({ error: "Weather API timeout" });
        } else if (error.response) {
            res.status(error.response.status).json({ 
                error: "Weather API error",
                details: error.response.data 
            });
        } else {
            res.status(500).json({ error: "Weather service unavailable" });
        }
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

// --- HEALTH CHECK ENDPOINT ---
app.get('/api/health', async (req, res) => {
    try {
        // Check database connection
        const dbCheck = await pool.query('SELECT NOW()');
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: {
                connected: true,
                time: dbCheck.rows[0].now
            },
            services: {
                overpass: 'available', // We don't check this to avoid rate limits
                weather: 'available'
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            database: {
                connected: false,
                error: error.message
            }
        });
    }
});

// --- DATABASE ENDPOINTS ---

// Safe query wrapper
const safeQuery = async (query, params = []) => {
    try {
        return await pool.query(query, params);
    } catch (error) {
        console.error('Database query error:', error.message);
        throw error;
    }
};

app.get('/api/stations', async (req, res) => {
    try {
        const result = await safeQuery('SELECT lat, lng, sqm, mag, date_observed FROM measurements LIMIT 1000');
        console.log(`📊 Sent ${result.rows.length} stations to frontend`);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Stations endpoint error:', err.message);
        // Return empty array instead of error to keep frontend alive
        res.json([]); 
    }
});

app.get('/api/measurement', async (req, res) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ error: "Missing lat/lng parameters" });
        }

        const query = `
            SELECT id, lat, lng, elevation, date_observed, sqm, mag, constellation, comment,
                   ST_Distance(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000 as distance_km
            FROM measurements
            ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326) LIMIT 1;`;
        const result = await safeQuery(query, [lng, lat]);
        
        if (result.rows.length > 0) {
            console.log(`📍 Found measurement at distance: ${result.rows[0].distance_km}km`);
            res.json(result.rows[0]);
        } else {
            res.json({});
        }
    } catch (err) {
        console.error('❌ Measurement endpoint error:', err.message);
        res.status(500).json({ error: "Database query failed" });
    }
});

// --- DATABASE SEEDING ---
async function seedDatabase() {
    console.log("🌱 Starting database seeding...");
    
    try {
        // Check if data already exists
        const existingCount = await pool.query('SELECT COUNT(*) FROM measurements');
        if (parseInt(existingCount.rows[0].count) > 0) {
            console.log("✅ Database already contains data. Skipping seeding.");
            return;
        }

        const csvPath = path.join(__dirname, '../data/GaN2024.csv');
        const results = [];

        await new Promise((resolve, reject) => {
            fs.createReadStream(csvPath)
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', resolve)
                .on('error', reject);
        });

        console.log(`📊 Processing ${results.length} rows from CSV...`);

        for (const row of results) {
            // Skip rows with invalid coordinates
            if (!row.Latitude || !row.Longitude || row.Latitude === '0.0' || row.Longitude === '0.0') {
                continue;
            }

            const lat = parseFloat(row.Latitude);
            const lng = parseFloat(row.Longitude);
            const elevation = parseFloat(row['Elevation(m)']) || 0;
            const limitingMag = parseFloat(row.LimitingMag) || null;
            const sqmReading = parseFloat(row.SQMReading) || null;
            const dateObserved = row.UTDate || null;
            const constellation = row.Constellation || null;
            const comment = row.SkyComment || null;

            try {
                await pool.query(
                    `INSERT INTO measurements (lat, lng, elevation, date_observed, sqm, mag, constellation, comment, geom)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ST_SetSRID(ST_MakePoint($2, $1), 4326))`,
                    [lat, lng, elevation, dateObserved, sqmReading, limitingMag, constellation, comment]
                );
            } catch (insertError) {
                console.warn(`⚠️ Skipping invalid row: ${insertError.message}`);
            }
        }

        const finalCount = await pool.query('SELECT COUNT(*) FROM measurements');
        console.log(`✅ Seeding complete! Added ${finalCount.rows[0].count} measurements to database.`);
        
    } catch (error) {
        console.error("❌ Seeding failed:", error.message);
        throw error;
    }
}

// --- SEEDING ENDPOINT ---
app.post('/api/seed-db', async (req, res) => {
    try {
        await seedDatabase();
        res.json({ success: true, message: "Database seeded successfully!" });
    } catch (error) {
        console.error("Seeding endpoint error:", error);
        res.status(500).json({ error: "Seeding failed" });
    }
});

// Export seed function for startup scripts
module.exports = { seedDatabase }; 

if (require.main === module) {
    // Auto-seed on startup if needed
    pool.query('SELECT COUNT(*) FROM measurements')
        .then(result => {
            if (parseInt(result.rows[0].count) === 0) {
                console.log("🌱 Database empty. Starting auto-seeding...");
                return seedDatabase();
            } else {
                console.log(`✅ Database has ${result.rows[0].count} measurements. Ready.`);
            }
        })
        .catch(err => console.warn("⚠️ Could not check database on startup:", err.message))
        .finally(() => {
            app.listen(port, () => console.log(`🚀 Server running on http://localhost:${port}`));
        });
}