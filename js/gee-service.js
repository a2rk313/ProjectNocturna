const ee = require('@google/earthengine');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');

let isInitialized = false;

// Initialize Google Earth Engine
async function init() {
    if (isInitialized) return;

    try {
        console.log('🌍 Initializing Google Earth Engine...');

        // Check for Service Account Key in environment
        // Supports GEE_PRIVATE_KEY_JSON (content) or GOOGLE_APPLICATION_CREDENTIALS (path)
        let privateKey;

        if (process.env.GEE_PRIVATE_KEY_JSON) {
            privateKey = JSON.parse(process.env.GEE_PRIVATE_KEY_JSON);
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
            const content = fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8');
            privateKey = JSON.parse(content);
        }

        if (privateKey) {
            // Authenticate with private key
            await new Promise((resolve, reject) => {
                ee.data.authenticateViaPrivateKey(privateKey, resolve, (err) => reject(err));
            });
            await new Promise((resolve, reject) => {
                ee.initialize(null, null, resolve, reject);
            });
            isInitialized = true;
            console.log('✅ Google Earth Engine initialized successfully.');
        } else {
            console.warn('⚠️ No GEE credentials found. GEE features will use fallbacks or fail.');
        }
    } catch (error) {
        console.error('❌ Failed to initialize Google Earth Engine:', error.message);
        // We do not re-throw so the server can still start
    }
}

/**
 * Get a Tile URL for a GEE Dataset
 * @param {string} datasetId - e.g., 'NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG'
 * @param {object} visParams - e.g., { min: 0, max: 60, palette: ['black', 'white'] }
 * @returns {Promise<string>} - The tile URL template
 */
async function getMapId(datasetId, visParams) {
    if (!isInitialized) {
        // Fallback for demo/testing without credentials
        console.warn('GEE not initialized. returning null for MapID.');
        return null;
    }

    try {
        const image = ee.Image(datasetId).select('avg_rad');
        // Get the latest available image if it's a collection
        // Usually VIIRS Monthly is a collection.
        // If datasetId points to a collection, we filter to recent.

        let targetImage;
        if (datasetId.includes('VIIRS')) {
             const collection = ee.ImageCollection(datasetId)
                .filterDate('2023-01-01', '2023-12-31') // Get recent year
                .sort('system:time_start', false); // Latest first
             targetImage = collection.first().select('avg_rad');
        } else {
             targetImage = ee.Image(datasetId);
        }

        const mapId = await new Promise((resolve, reject) => {
            targetImage.getMap(visParams, (mapId, err) => {
                if (err) reject(err);
                else resolve(mapId);
            });
        });

        return mapId.urlFormat;
    } catch (error) {
        console.error('Error getting MapID:', error);
        throw error;
    }
}

/**
 * Get statistics for a region
 * @param {object} geoJSON - The geometry to analyze
 * @returns {Promise<object>} - Stats object
 */
async function getRegionStats(geoJSON) {
    if (!isInitialized) return null;

    try {
        // Create an EE Geometry from GeoJSON
        // Note: Turf.js or client-side might send GeoJSON.
        // EE expects a geometry object.
        const geometry = ee.Geometry(geoJSON);

        // Dataset: VIIRS Monthly (Latest)
        const collection = ee.ImageCollection('NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG')
            .filterDate('2023-01-01', '2023-12-31')
            .sort('system:time_start', false);
        const image = collection.first().select('avg_rad');

        // Reduce region
        const stats = await new Promise((resolve, reject) => {
            image.reduceRegion({
                reducer: ee.Reducer.mean(),
                geometry: geometry,
                scale: 500, // VIIRS resolution is ~750m, 500 is fine
                maxPixels: 1e9
            }).evaluate((result, err) => {
                if (err) reject(err);
                else resolve(result);
            });
        });

        return {
            avg_radiance: stats.avg_rad
        };
    } catch (error) {
        console.error('Error calculating region stats:', error);
        return null;
    }
}

module.exports = {
    init,
    getMapId,
    getRegionStats
};
