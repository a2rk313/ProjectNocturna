// NASA Earthdata API Integration for VIIRS DNB Data
// Replaces FIRMS fire data with proper nighttime lights data

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class EarthdataAPI {
    constructor() {
        this.baseURL = 'https://cmr.earthdata.nasa.gov/search';
        this.earthdataURL = 'https://search.earthdata.nasa.gov';
        this.laadsURL = 'https://ladsweb.modaps.eosdis.nasa.gov';
        this.token = process.env.EARTHDATA_TOKEN || null;
        this.username = process.env.EARTHDATA_USERNAME || null;
        this.password = process.env.EARTHDATA_PASSWORD || null;
    }

    // Authentication setup for Earthdata
    getAuthHeaders() {
        const headers = {
            'User-Agent': 'Project-Nocturna/1.0 (light-pollution-research)',
            'Accept': 'application/json'
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        } else if (this.username && this.password) {
            headers['Authorization'] = `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`;
        }

        return headers;
    }

    // Search for VIIRS DNB granules by location and time
    async searchVIIRSGranules(bounds, startDate, endDate, productCode = 'VNP46A2') {
        try {
            const [minLat, minLon, maxLat, maxLon] = bounds;
            
            // CMR API query parameters
            const params = {
                short_name: productCode,
                version: '1',
                temporal: `${startDate}T00:00:00Z,${endDate}T23:59:59Z`,
                bounding_box: `${minLon},${minLat},${maxLon},${maxLat}`,
                page_size: 100,
                sort_key: '-start_date'
            };

            console.log(`🔍 Searching VIIRS DNB granules for ${productCode}...`);
            
            const response = await axios.get(`${this.baseURL}/granules.json`, {
                params,
                headers: this.getAuthHeaders()
            });

            const granules = response.data.feed.entry || [];
            console.log(`📊 Found ${granules.length} VIIRS DNB granules`);

            return granules.map(granule => ({
                id: granule.id,
                title: granule.title,
                start_time: granule.time_start,
                end_time: granule.time_end,
                orbit: granule.orbit_number,
                day_night_flag: granule.day_night_flag,
                links: granule.links || [],
                bbox: granule.polygons?.[0] || null,
                cloud_cover: granule.cloud_cover || 0,
                browse_urls: this.extractBrowseURLs(granule.links || [])
            }));

        } catch (error) {
            console.error('❌ Error searching VIIRS granules:', error.message);
            throw new Error(`Earthdata API search failed: ${error.message}`);
        }
    }

    // Extract browse URLs from granule links
    extractBrowseURLs(links) {
        const browseUrls = {};
        
        links.forEach(link => {
            if (link.rel === 'browse') {
                const type = this.getBrowseType(link.href);
                if (type) {
                    browseUrls[type] = link.href;
                }
            }
        });

        return browseUrls;
    }

    getBrowseType(href) {
        if (href.includes('jpg') || href.includes('jpeg')) return 'jpg';
        if (href.includes('png')) return 'png';
        if (href.includes('hdf') || href.includes('h5')) return 'hdf5';
        return null;
    }

    // Download VIIRS DNB data file
    async downloadVIIRSData(downloadURL, localPath) {
        try {
            console.log(`📥 Downloading VIIRS data: ${downloadURL}`);
            
            const response = await axios.get(downloadURL, {
                responseType: 'stream',
                headers: this.getAuthHeaders()
            });

            // Ensure directory exists
            const dir = path.dirname(localPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Write file
            const writer = fs.createWriteStream(localPath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    console.log(`✅ Downloaded: ${localPath}`);
                    resolve(localPath);
                });
                writer.on('error', reject);
            });

        } catch (error) {
            console.error('❌ Download failed:', error.message);
            throw new Error(`Download failed: ${error.message}`);
        }
    }

    // Get data for specific location (point-based query)
    async getVIIRSDataForPoint(lat, lng, radius = 0.25, days = 30) {
        try {
            const bounds = [
                lat - radius,
                lng - radius,
                lat + radius,
                lng + radius
            ];

            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const granules = await this.searchVIIRSGranules(bounds, startDate, endDate);
            
            // Filter for best quality granules (low cloud cover, nighttime)
            const qualityGranules = granules
                .filter(g => (g.cloud_cover || 0) < 20) // Less than 20% cloud cover
                .filter(g => g.day_night_flag === 'Night')
                .slice(0, 5); // Take top 5 most recent

            return {
                location: { lat, lng },
                bounds,
                time_range: { start: startDate, end: endDate },
                total_granules: granules.length,
                quality_granules: qualityGranules.length,
                granules: qualityGranules
            };

        } catch (error) {
            console.error('❌ Point query failed:', error.message);
            throw error;
        }
    }

    // Process HDF5 file for light pollution analysis
    async processVIIRSHDF5(filePath) {
        try {
            // This would require HDF5 library integration
            // For now, return metadata and structure for processing
            
            const stats = fs.statSync(filePath);
            
            return {
                file_path: filePath,
                file_size: stats.size,
                file_modified: stats.mtime,
                processing_status: 'pending',
                note: 'HDF5 processing requires additional libraries (hdf5-node)',
                datasets: [
                    'HDFEOS/GRIDS/VNP_Grid_DNB/Data_Fields/DNB_At_Sensor_Radiance',
                    'HDFEOS/GRIDS/VNP_Grid_DNB/Data_Fields/QF_DNB',
                    'HDFEOS/GRIDS/VNP_Grid_DNB/Data_Fields/Moon_Illumination_Fraction',
                    'HDFEOS/GRIDS/VNP_Grid_DNB/Data_Fields/Lunar_Zenith_Angle'
                ]
            };

        } catch (error) {
            console.error('❌ HDF5 processing failed:', error.message);
            throw error;
        }
    }

    // Create synthetic VIIRS-like data for development/testing
    createSyntheticVIIRSData(lat, lng, bounds) {
        const [minLat, minLon, maxLat, maxLon] = bounds;
        const dataPoints = [];
        
        // Generate realistic light pollution data based on urban characteristics
        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLon + maxLon) / 2;
        
        // Create grid of data points
        for (let i = 0; i < 20; i++) {
            for (let j = 0; j < 20; j++) {
                const pointLat = minLat + (maxLat - minLat) * (i / 20);
                const pointLng = minLon + (maxLon - minLng) * (j / 20);
                
                // Distance from center affects brightness
                const distance = Math.sqrt(
                    Math.pow(pointLat - centerLat, 2) + 
                    Math.pow(pointLng - centerLng, 2)
                );
                
                // Urban areas are brighter
                const isUrban = Math.random() > 0.7;
                const baseBrightness = isUrban ? 50 : 5;
                const distanceFactor = Math.max(0.1, 1 - distance * 2);
                
                // Add some randomness
                const brightness = baseBrightness * distanceFactor * (0.8 + Math.random() * 0.4);
                
                dataPoints.push({
                    lat: pointLat,
                    lng: pointLng,
                    brightness: Math.round(brightness * 100) / 100,
                    confidence: Math.random() > 0.1 ? 'high' : 'medium',
                    source: 'synthetic_viirs',
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        return dataPoints;
    }

    // Validation against known light pollution locations
    validateDataQuality(dataPoints, knownLocations) {
        const validation = {
            total_points: dataPoints.length,
            validation_results: [],
            overall_quality: 'unknown'
        };

        knownLocations.forEach(location => {
            const nearbyPoints = dataPoints.filter(point => {
                const distance = Math.sqrt(
                    Math.pow(point.lat - location.lat, 2) + 
                    Math.pow(point.lng - location.lng, 2)
                );
                return distance < 0.1; // Within ~10km
            });

            if (nearbyPoints.length > 0) {
                const avgBrightness = nearbyPoints.reduce((sum, p) => sum + p.brightness, 0) / nearbyPoints.length;
                const expectedBrightness = location.expected_brightness || 10;
                const error = Math.abs(avgBrightness - expectedBrightness) / expectedBrightness;
                
                validation.validation_results.push({
                    location: location.name,
                    expected_brightness: expectedBrightness,
                    measured_brightness: Math.round(avgBrightness * 100) / 100,
                    error_percentage: Math.round(error * 100),
                    quality: error < 0.2 ? 'good' : error < 0.5 ? 'fair' : 'poor'
                });
            }
        });

        // Calculate overall quality
        const goodResults = validation.validation_results.filter(r => r.quality === 'good').length;
        const totalResults = validation.validation_results.length;
        
        if (totalResults > 0) {
            const goodPercentage = goodResults / totalResults;
            validation.overall_quality = goodPercentage > 0.8 ? 'excellent' : 
                                       goodPercentage > 0.6 ? 'good' : 
                                       goodPercentage > 0.4 ? 'fair' : 'poor';
        }

        return validation;
    }
}

// Known light pollution validation locations
const knownLocations = [
    {
        name: 'Central Park, New York',
        lat: 40.7829,
        lng: -73.9654,
        expected_brightness: 85, // High light pollution
        type: 'urban_park'
    },
    {
        name: 'Death Valley National Park',
        lat: 36.5054,
        lng: -117.0794,
        expected_brightness: 2, // Dark sky location
        type: 'dark_sky_park'
    },
    {
        name: 'Times Square, New York',
        lat: 40.7580,
        lng: -73.9855,
        expected_brightness: 120, // Extremely bright
        type: 'commercial_center'
    },
    {
        name: 'Mauna Kea, Hawaii',
        lat: 19.8206,
        lng: -155.4680,
        expected_brightness: 1, // World-class dark sky
        type: 'observatory'
    }
];

module.exports = {
    EarthdataAPI,
    knownLocations
};