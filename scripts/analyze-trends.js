// scripts/analyze-trends.js
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const { EarthdataAPI } = require('../lib/earthdata-api');
const HDF5Processor = require('../lib/hdf5-processor');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'light_pollution_db',
  password: process.env.DB_PASSWORD || 'your_password',
  port: parseInt(process.env.DB_PORT) || 5432,
});

const AOI_BOUNDS = [-90, -180, 90, 180]; 
const ANALYSIS_MONTHS = 12;

// --- ROBUST ALGORITHM: Theil-Sen Estimator ---
function calculateRobustTrend(timeSeriesData) {
    const n = timeSeriesData.length;
    if (n < 2) return { slope: 0, intercept: 0, confidence: 0, trend: 'insufficient_data' };

    // 1. Calculate all pairwise slopes
    let slopes = [];
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            slopes.push((timeSeriesData[j].avg_radiance - timeSeriesData[i].avg_radiance) / (j - i));
        }
    }
    slopes.sort((a, b) => a - b);
    const medianSlope = slopes[Math.floor(slopes.length / 2)];

    // 2. Calculate Intercept (Median of residuals)
    const intercepts = timeSeriesData.map((d, i) => d.avg_radiance - medianSlope * i);
    intercepts.sort((a, b) => a - b);
    const medianIntercept = intercepts[Math.floor(intercepts.length / 2)];

    // 3. Mann-Kendall Significance Test
    let s = 0;
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const diff = timeSeriesData[j].avg_radiance - timeSeriesData[i].avg_radiance;
            if (diff > 0) s++; else if (diff < 0) s--;
        }
    }
    const variance = (n * (n - 1) * (2 * n + 5)) / 18;
    const z = s > 0 ? (s - 1) / Math.sqrt(variance) : (s + 1) / Math.sqrt(variance);
    const confidence = (1 - (0.5 * Math.exp(-0.5 * z * z))) * 100;

    return {
        slope: medianSlope,
        intercept: medianIntercept,
        confidence_score: confidence.toFixed(2),
        annual_change_rate: (medianSlope * 12).toFixed(4),
        direction: Math.abs(medianSlope) < 0.01 ? 'stable' : (medianSlope > 0 ? 'increasing' : 'decreasing')
    };
}

// --- Helper: Backfill Historical Data ---
async function ensureHistoricalData(client, earthdata, processor) {
    console.log('🕰️  Checking historical coverage...');
    const today = new Date();
    
    for (let i = 0; i < ANALYSIS_MONTHS; i++) {
        const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const dateStr = targetDate.toISOString().split('T')[0];
        
        const exists = await client.query(`SELECT 1 FROM satellite_light_data WHERE acquisition_date BETWEEN $1::date - 5 AND $1::date + 5 LIMIT 1`, [dateStr]);
        
        if (!exists.rowCount) {
            console.log(`📉 Fetching backfill for ${dateStr}...`);
            const searchStart = new Date(targetDate); searchStart.setDate(searchStart.getDate() - 2);
            const searchEnd = new Date(targetDate); searchEnd.setDate(searchEnd.getDate() + 2);
            
            try {
                const granules = await earthdata.searchVIIRSGranules(AOI_BOUNDS, searchStart.toISOString().split('T')[0], searchEnd.toISOString().split('T')[0]);
                if (granules.length > 0) {
                    const best = granules.sort((a, b) => a.cloud_cover - b.cloud_cover)[0];
                    if (best.cloud_cover < 40) {
                        const dlUrl = best.links.find(l => l.href.endsWith('.h5'))?.href;
                        const localPath = path.join(__dirname, '../data/downloads', `${best.id}.h5`);
                        if (!fs.existsSync(localPath)) await earthdata.downloadVIIRSData(dlUrl, localPath);
                        
                        const processed = await processor.processVIIRSFile(localPath);
                        const geoData = processor.toGeoJSON(processed, AOI_BOUNDS, { sampleRate: 20 }); 
                        
                        for (const f of geoData.features) {
                             await client.query(`INSERT INTO satellite_light_data (location, latitude, longitude, radiance_value, acquisition_date, satellite_source) VALUES (ST_SetSRID(ST_MakePoint($1, $2), 4326), $2, $1, $3, $4, 'VIIRS_NPP')`, [f.geometry.coordinates[0], f.geometry.coordinates[1], f.properties.radiance, f.properties.timestamp]);
                        }
                        console.log(`✅ Backfilled ${dateStr}`);
                    }
                }
            } catch (e) { console.warn(`⚠️ Backfill failed: ${e.message}`); }
        }
    }
}

// --- Change Detection Layer ---
async function generateChangeLayer(client, history) {
    console.log('🗺️  Generating Spatial Change Layer...');
    const startM = history.slice(0, 2).map(h => h.month);
    const endM = history.slice(-2).map(h => h.month);
    if (startM.length === 0 || endM.length === 0) return null;

    const res = await client.query(`
        WITH baseline AS (SELECT ST_SnapToGrid(location, 0.005) as grid, AVG(radiance_value) as val FROM satellite_light_data WHERE to_char(acquisition_date, 'YYYY-MM') = ANY($1) GROUP BY 1),
             current AS (SELECT ST_SnapToGrid(location, 0.005) as grid, AVG(radiance_value) as val FROM satellite_light_data WHERE to_char(acquisition_date, 'YYYY-MM') = ANY($2) GROUP BY 1)
        SELECT ST_X(COALESCE(b.grid, c.grid)) as lng, ST_Y(COALESCE(b.grid, c.grid)) as lat, (c.val - b.val) as change FROM baseline b FULL OUTER JOIN current c ON b.grid = c.grid WHERE ABS(c.val - b.val) > 2.0
    `, [startM, endM]);

    return {
        type: 'FeatureCollection',
        features: res.rows.map(r => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
            properties: { change: parseFloat(r.change).toFixed(2), category: r.change > 15 ? 'hotspot' : 'reduction' }
        }))
    };
}

// --- Main Workflow ---
async function runTrendAnalysis() {
    const earthdata = new EarthdataAPI();
    const processor = new HDF5Processor();
    const client = await pool.connect();

    try {
        console.log(`🚀 Starting Robust Analysis [Theil-Sen]...`);
        await ensureHistoricalData(client, earthdata, processor);

        const tsRes = await client.query(`SELECT to_char(acquisition_date, 'YYYY-MM') as month, AVG(radiance_value) as avg_radiance FROM satellite_light_data WHERE latitude BETWEEN $1 AND $2 AND longitude BETWEEN $3 AND $4 GROUP BY 1 ORDER BY 1 ASC`, [AOI_BOUNDS[0], AOI_BOUNDS[2], AOI_BOUNDS[1], AOI_BOUNDS[3]]);
        const history = tsRes.rows.map(r => ({ month: r.month, avg_radiance: parseFloat(r.avg_radiance) }));

        if (history.length < 2) return console.log('⚠️ Insufficient data.');

        const trendStats = calculateRobustTrend(history);
        const changeLayer = await generateChangeLayer(client, history);
        
        const userRes = await client.query("SELECT uuid FROM users LIMIT 1");
        await client.query('BEGIN');
        await client.query(`INSERT INTO analysis_reports (title, report_type, author_user_id, summary_statistics, data_visualizations, is_public) VALUES ($1, $2, $3, $4, $5, $6)`, [
            `Robust Trend Report`, 'trend_analysis', userRes.rows[0].uuid,
            JSON.stringify(trendStats),
            JSON.stringify({ time_series: history, change_map: changeLayer }),
            true
        ]);
        await client.query('COMMIT');
        
        console.log(`✅ Report Saved. Direction: ${trendStats.direction}, Confidence: ${trendStats.confidence_score}%`);

    } catch (e) { await client.query('ROLLBACK'); console.error(e); } 
    finally { client.release(); await pool.end(); }
}

if (require.main === module) runTrendAnalysis();