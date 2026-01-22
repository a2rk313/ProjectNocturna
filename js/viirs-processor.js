/**
 * VIIRS Data Processor
 * Handles downloading, processing, and storing VIIRS nighttime lights data
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// PostgreSQL connection
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'nocturna',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

/**
 * Downloads VIIRS data from NASA Earthdata API
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @param {object} bbox - Bounding box {minLon, minLat, maxLon, maxLat}
 */
async function downloadVIIRSData(startDate, endDate, bbox) {
    try {
        console.log(`🌍 Downloading VIIRS data for period: ${startDate} to ${endDate}`);
        
        // This is a simplified example - in a real implementation you would connect to NASA's API
        // For now, we'll simulate downloading data by generating sample data
        const viirsData = generateSampleVIIRSData(bbox);
        
        console.log(`✅ Downloaded ${viirsData.length} VIIRS tiles`);
        return viirsData;
    } catch (error) {
        console.error('❌ Error downloading VIIRS data:', error);
        throw error;
    }
}

/**
 * Generates sample VIIRS data for testing purposes
 * @param {object} bbox - Bounding box {minLon, minLat, maxLon, maxLat}
 */
function generateSampleVIIRSData(bbox) {
    const { minLon, minLat, maxLon, maxLat } = bbox;
    const data = [];
    
    // Generate a grid of sample data points
    const lonStep = (maxLon - minLon) / 10;
    const latStep = (maxLat - minLat) / 10;
    
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            const lon = minLon + (i * lonStep);
            const lat = minLat + (j * latStep);
            
            // Create a small polygon around each point
            const delta = 0.02; // ~2km square
            const polygonWKT = `POLYGON((${lon-delta} ${lat-delta}, ${lon+delta} ${lat-delta}, ${lon+delta} ${lat+delta}, ${lon-delta} ${lat+delta}, ${lon-delta} ${lat-delta}))`;
            
            // Random radiance value between 0 and 100 (typical for VIIRS)
            const radiance = Math.random() * 100;
            
            data.push({
                geom: polygonWKT,
                radiance_avg: radiance,
                acquisition_date: '2023-01-01',
                source_file: 'sample_vnir_tiles'
            });
        }
    }
    
    return data;
}

/**
 * Stores VIIRS data in the database
 * @param {Array} viirsData - Array of VIIRS data objects
 */
async function storeVIIRSData(viirsData) {
    try {
        console.log('💾 Storing VIIRS data in database...');
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Clear existing VIIRS data (for demo purposes)
            await client.query('DELETE FROM viirs_data');
            
            // Insert new data
            for (const record of viirsData) {
                await client.query(
                    `INSERT INTO viirs_data (geom, radiance_avg, acquisition_date, source_file) 
                     VALUES (ST_GeomFromText($1, 4326), $2, $3, $4)`,
                    [record.geom, record.radiance_avg, record.acquisition_date, record.source_file]
                );
            }
            
            await client.query('COMMIT');
            console.log(`✅ Stored ${viirsData.length} VIIRS records in database`);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('❌ Error storing VIIRS data:', error);
        throw error;
    }
}

/**
 * Main function to process VIIRS data
 */
async function processVIIRSData() {
    try {
        // Define bounding box for US (as an example)
        const bbox = {
            minLon: -125,  // West coast
            minLat: 24,    // Mexico border
            maxLon: -66,   // East coast  
            maxLat: 49     // Canada border
        };
        
        const startDate = '2023-01-01';
        const endDate = '2023-12-31';
        
        console.log('🚀 Starting VIIRS data processing...');
        
        // Download data
        const viirsData = await downloadVIIRSData(startDate, endDate, bbox);
        
        // Store in database
        await storeVIIRSData(viirsData);
        
        console.log('✅ VIIRS data processing completed successfully!');
    } catch (error) {
        console.error('💥 VIIRS processing failed:', error);
    } finally {
        await pool.end();
    }
}

// Run the processor if this file is called directly
if (require.main === module) {
    processVIIRSData();
}

module.exports = {
    downloadVIIRSData,
    storeVIIRSData,
    generateSampleVIIRSData,
    processVIIRSData
};