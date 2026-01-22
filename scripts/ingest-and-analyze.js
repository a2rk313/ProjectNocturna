// scripts/ingest-and-analyze.js
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

async function ingestAndAnalyze(aoiBounds, options = {}) {
  const { 
    timeRangeDays = 2, 
    sampleRate = 10 
  } = options;

  const earthdata = new EarthdataAPI();
  const processor = new HDF5Processor();
  let client;
  try {
    const clientResponse = await pool.connect();
    client = clientResponse;
    console.log('🚀 Starting VIIRS Ingestion & Analysis Workflow...');
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 86400000 * timeRangeDays).toISOString().split('T')[0];
    
    const granules = await earthdata.searchVIIRSGranules(aoiBounds, startDate, endDate);
    if (granules.length === 0) {
      console.log('⚠️ No granules found.');
      return { message: 'No granules found for the specified area and time range.' };
    }

    const bestGranule = granules.sort((a, b) => a.cloud_cover - b.cloud_cover)[0];
    const downloadUrl = bestGranule.links.find(l => l.href.endsWith('.h5'))?.href;

    if (!downloadUrl) {
      throw new Error('No H5 download link found for the best granule.');
    }

    const localPath = path.join(__dirname, '../data/downloads', `${bestGranule.id}.h5`);
    
    if (!fs.existsSync(localPath)) {
      await earthdata.downloadVIIRSData(downloadUrl, localPath);
    }

    const processed = await processor.processVIIRSFile(localPath);
    const geoData = processor.toGeoJSON(processed, aoiBounds, { sampleRate });

    await client.query('BEGIN');
    let totalRadiance = 0, maxRadiance = 0, bortleDist = {}, hotspots = [];

    for (const feature of geoData.features) {
      const { coordinates } = feature.geometry;
      const { radiance, sqm, bortle_class, timestamp } = feature.properties;

      await client.query(`
        INSERT INTO satellite_light_data 
        (location, latitude, longitude, radiance_value, acquisition_date, satellite_source, cloud_coverage_percentage)
        VALUES (ST_SetSRID(ST_MakePoint($1, $2), 4326), $2, $1, $3, $4, 'VIIRS_NPP', $5)
      `, [coordinates[0], coordinates[1], radiance, timestamp, Math.round(bestGranule.cloud_cover)]);

      if (radiance !== null) {
        totalRadiance += radiance;
        maxRadiance = Math.max(maxRadiance, radiance);
        bortleDist[bortle_class || 9] = (bortleDist[bortle_class || 9] || 0) + 1;
        if (radiance > 50) hotspots.push({ lat: coordinates[1], lng: coordinates[0], radiance });
      }
    }

    const avgRadiance = totalRadiance / geoData.features.length;
    hotspots.sort((a, b) => b.radiance - a.radiance);
    
    // Insert Report
    const userRes = await client.query('SELECT uuid FROM users LIMIT 1');
    const userId = userRes.rows[0]?.uuid;
    if (!userId) {
      console.warn("No user found to associate with the report. The report will not be created.");
    } else {
      await client.query(`
        INSERT INTO analysis_reports 
        (title, report_type, author_user_id, parameters_used, methodology, summary_statistics, is_public)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        `VIIRS Ingestion: ${bestGranule.id}`, 'ingestion_analysis', userId,
        JSON.stringify({ bounds: aoiBounds, granule: bestGranule.id }),
        'Automated VIIRS HDF5 Processing',
        JSON.stringify({ mean: avgRadiance, max: maxRadiance, bortle: bortleDist }),
        true
      ]);
    }

    await client.query('COMMIT');
    console.log('✅ Ingestion Complete!');
    return { message: 'Ingestion completed successfully.' };

  } catch (error) {
    if (client) {
    await client.query('ROLLBACK');
  }
    console.error('❌ Error:', error);
    throw new Error('Failed to ingest and analyze data.');
  } finally {
    if (client) {
      client.release();
}
  }
}

module.exports = {
    ingestAndAnalyze
};