// routes/viirs.js - NASA VIIRS data routes
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { calculateStdDev, generateSampleVIIRSData } = require('../utils/data-utils');

// Import our enhanced light pollution dataset
let LightPollutionData;
try {
  LightPollutionData = require('../data/light-pollution-data');
} catch (error) {
  console.log('⚠️ Enhanced light pollution dataset not found, using direct API calls');
}

// Import Earthdata API if available
let EarthdataAPI;
try {
  EarthdataAPI = require('../lib/earthdata-api');
} catch (error) {
  console.log('⚠️ Earthdata API library not found, using direct API calls');
}

// Route for year only (like /api/viirs/2023)
router.get('/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const month = null; // No month provided
    
    console.log(`🌍 NASA VIIRS Request: year=${year}, bbox=${req.query.bbox}`);
    
    await handleVIIRSRequest(req, res, year, month);
  } catch (error) {
    console.error('❌ NASA VIIRS Error (year only):', error.message);
    res.status(500).json({ error: 'Failed to process VIIRS request', message: error.message });
  }
});

// Route for year and month (like /api/viirs/2023/06)
router.get('/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    
    console.log(`🌍 NASA VIIRS Request: year=${year}, month=${month}, bbox=${req.query.bbox}`);
    
    await handleVIIRSRequest(req, res, year, month);
  } catch (error) {
    console.error('❌ NASA VIIRS Error (year/month):', error.message);
    res.status(500).json({ error: 'Failed to process VIIRS request', message: error.message });
  }
});

// Helper function for VIIRS data processing - Enhanced with comprehensive light pollution dataset
async function handleVIIRSRequest(req, res, year, month) {
  try {
    const { bbox } = req.query;
    
    console.log(`🌍 NASA VIIRS Request: year=${year}, bbox=${bbox}`);
    
    // If we have the enhanced dataset and bbox is provided, use it
    if (LightPollutionData && bbox) {
      try {
        const [minLon, minLat, maxLon, maxLat] = bbox.split(',').map(Number);
        
        // Calculate center point for geographic pattern matching
        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLon + maxLon) / 2;
        const radius = Math.min(2, Math.max(0.1, (maxLat - minLat) / 2));
        
        // Use our enhanced dataset to generate realistic data
        const enhancedData = LightPollutionData.getLightPollutionData(centerLat, centerLng, { radius });
        
        if (enhancedData && enhancedData.data && enhancedData.data.length > 0) {
          console.log(`✅ Using enhanced dataset for VIIRS request: ${enhancedData.data.length} points`);
          
          // Transform the enhanced data to match VIIRS format
          const transformedData = enhancedData.data.map(point => ({
            lat: point.lat,
            lng: point.lng,
            brightness: 21.8 - (point.brightness * 0.8), // Convert SQM to VIIRS-like brightness
            frp: (22.5 - point.brightness) * 0.5, // Fire Radiative Power equivalent
            confidence: point.confidence === 'high' ? 90 : 50,
            date: point.timestamp,
            source: 'Enhanced Light Pollution Dataset'
          }));
          
          return res.json({
            source: 'Enhanced Light Pollution Dataset (VIIRS Equivalent)',
            year: year || 2023,
            month: month || 'annual',
            date: new Date().toISOString(),
            count: transformedData.length,
            avg_brightness: enhancedData.summary.avg_sqm,
            min_brightness: enhancedData.summary.min_sqm,
            max_brightness: enhancedData.summary.max_sqm,
            std_dev: calculateStdDev(transformedData.map(d => d.brightness)).toFixed(2),
            data: transformedData.slice(0, 1000), // Limit for performance
            metadata: {
              enhanced_dataset: true,
              geographic_patterns_applied: true,
              closest_reference: enhancedData.summary.closest_reference,
              citations: enhancedData.metadata.citations
            }
          });
        }
      } catch (enhancedError) {
        console.log('Enhanced dataset processing failed, falling back to API:', enhancedError.message);
      }
    }
    
    // Check if NASA API key exists
    if (!process.env.NASA_API_KEY) {
      console.log('⚠️ NASA API key not configured, using enhanced dataset as fallback');
      
      // Use enhanced dataset with default values
      let enhancedData;
      if (LightPollutionData) {
        enhancedData = LightPollutionData.getLightPollutionData(40, -95, { radius: 1.5 }); // US central region
      } else {
        // Fallback to original sample data
        return res.json({
          source: 'NASA VIIRS Nighttime Lights (Sample Data)',
          year: year || 2023,
          month: month || 'annual',
          date: new Date().toISOString(),
          count: 150,
          avg_brightness: 15.3,
          min_brightness: 0.5,
          max_brightness: 85.2,
          std_dev: 12.4,
          note: 'Sample data used - NASA API key not configured. Get your free key at https://earthdata.nasa.gov/',
          data: generateSampleVIIRSData(bbox)
        });
      }
      
      // Transform the enhanced data to match VIIRS format
      const transformedData = enhancedData.data.map(point => ({
        lat: point.lat,
        lng: point.lng,
        brightness: 21.8 - (point.brightness * 0.8), // Convert SQM to VIIRS-like brightness
        frp: (22.5 - point.brightness) * 0.5, // Fire Radiative Power equivalent
        confidence: point.confidence === 'high' ? 90 : 50,
        date: point.timestamp,
        source: 'Enhanced Light Pollution Dataset'
      }));
      
      return res.json({
        source: 'Enhanced Light Pollution Dataset (VIIRS Equivalent)',
        year: year || 2023,
        month: month || 'annual',
        date: new Date().toISOString(),
        count: transformedData.length,
        avg_brightness: enhancedData.summary.avg_sqm,
        min_brightness: enhancedData.summary.min_sqm,
        max_brightness: enhancedData.summary.max_sqm,
        std_dev: calculateStdDev(transformedData.map(d => d.brightness)).toFixed(2),
        data: transformedData.slice(0, 1000), // Limit for performance
        metadata: {
          enhanced_dataset: true,
          geographic_patterns_applied: true,
          closest_reference: enhancedData.summary.closest_reference,
          citations: enhancedData.metadata.citations
        }
      });
    }
    
    // Use Earthdata API if available
    if (EarthdataAPI) {
      try {
        const earthdata = new EarthdataAPI(
          process.env.EARTHDATA_USERNAME,
          process.env.EARTHDATA_PASSWORD,
          process.env.NASA_API_KEY
        );
        
        // Convert bbox string to array
        let bounds;
        if (bbox) {
          const [minLon, minLat, maxLon, maxLat] = bbox.split(',').map(Number);
          bounds = [minLat, minLon, maxLat, maxLon]; // Format: [south, west, north, east]
        } else {
          bounds = [-90, -180, 90, 180]; // Global bounds
        }
        
        // Get VIIRS data using Earthdata API
        const viirsData = await earthdata.getVIIRSData(bounds, 7); // Last 7 days
        
        // Calculate statistics
        const brightnessValues = viirsData.data.map(d => d.brightness);
        const avgBrightness = brightnessValues.length > 0 ? 
          brightnessValues.reduce((a, b) => a + b, 0) / brightnessValues.length : 15.3;
        const maxBrightness = brightnessValues.length > 0 ? Math.max(...brightnessValues) : 85.2;
        const minBrightness = brightnessValues.length > 0 ? Math.min(...brightnessValues) : 0.5;
        
        return res.json({
          ...viirsData,
          year: year || 2023,
          month: month || 'annual',
          avg_brightness: avgBrightness.toFixed(2),
          min_brightness: minBrightness.toFixed(2),
          max_brightness: maxBrightness.toFixed(2),
          std_dev: calculateStdDev(brightnessValues).toFixed(2)
        });
        
      } catch (earthdataError) {
        console.error('❌ Earthdata API failed:', earthdataError.message);
        // Fall back to direct API call
      }
    }
    
    // Fallback to direct FIRMS API call
    let url;
    if (bbox) {
      try {
        const [minLon, minLat, maxLon, maxLat] = bbox.split(',').map(Number);
        // Validate bounding box
        if (isNaN(minLon) || isNaN(minLat) || isNaN(maxLon) || isNaN(maxLat)) {
          throw new Error('Invalid bounding box coordinates');
        }
        
        // Normalize longitude values to valid range (-180 to 180)
        // Handle extreme values like -294.96° and 295.31° properly
        let normalizedMinLon = ((minLon + 180) % 360);
        if (normalizedMinLon < 0) normalizedMinLon += 360;
        normalizedMinLon = normalizedMinLon - 180;
        
        let normalizedMaxLon = ((maxLon + 180) % 360);
        if (normalizedMaxLon < 0) normalizedMaxLon += 360;
        normalizedMaxLon = normalizedMaxLon - 180;
        
        // Ensure latitude values are within valid range (-90 to 90)
        const normalizedMinLat = Math.max(-90, Math.min(90, minLat));
        const normalizedMaxLat = Math.max(-90, Math.min(90, maxLat));
        
        // Check if the original range spans more than 180 degrees, which indicates
        // a wraparound that covers most of the globe
        const originalRange = Math.abs(maxLon - minLon);
        if (originalRange > 180) {
            // If the original range was > 180 degrees, it likely represents a wraparound
            // covering most of the globe. Use the global endpoint instead of area endpoint.
            console.log(`🌍 Large range detected (${originalRange.toFixed(2)}°), using global data`);
            url = `https://firms.modaps.eosdis.nasa.gov/api/country/csv/${process.env.NASA_API_KEY}/VIIRS_NOAA20_NTL/WLD/7`;
        } else {
            // Adjust longitude range if crossing antimeridian
            let finalMinLon = normalizedMinLon;
            let finalMaxLon = normalizedMaxLon;
            
            // If longitude range crosses the antimeridian (west > east), 
            // we need to handle it differently since NASA API doesn't support this
            if (normalizedMinLon > normalizedMaxLon) {
                // These are just badly ordered coordinates after normalization
                // Simply swap them to ensure west < east
                finalMinLon = normalizedMaxLon;
                finalMaxLon = normalizedMinLon;
            }
            
            // Ensure final values are within bounds
            finalMinLon = Math.max(-180, Math.min(180, finalMinLon));
            finalMaxLon = Math.max(-180, Math.min(180, finalMaxLon));
            
            // NASA FIRMS API format: south/west/north/east - corrected for light pollution research
            url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${process.env.NASA_API_KEY}/VIIRS_NOAA20_NTL/${normalizedMinLat}/${finalMinLon}/${normalizedMaxLat}/${finalMaxLon}/7`;
        }
      } catch (coordError) {
        console.error('Bounding box error:', coordError);
        return res.json({
          source: 'NASA VIIRS (Sample - Invalid bbox)',
          year: year || 2023,
          count: 100,
          data: generateSampleVIIRSData()
        });
      }
    } else {
      // Global data
      url = `https://firms.modaps.eosdis.nasa.gov/api/country/csv/${process.env.NASA_API_KEY}/VIIRS_NOAA20_NTL/WLD/7`;
    }
    
    console.log(`🌐 Calling NASA API: ${url.replace(process.env.NASA_API_KEY, '***')}`);
    
    const response = await axios.get(url, { 
      timeout: 15000,
      headers: {
        'User-Agent': 'Project-Nocturna/1.0'
      }
    });
    
    // Parse CSV response
    const lines = response.data.split('\n').filter(line => {
      return line.trim() && !line.startsWith('#') && !line.startsWith('latitude');
    });
    
    const data = lines.map(line => {
      const [lat, lon, brightness, frp, confidence, date] = line.split(',');
      return {
        lat: parseFloat(lat) || 0,
        lng: parseFloat(lon) || 0,
        brightness: parseFloat(brightness) || 0,
        frp: parseFloat(frp) || 0,
        confidence: confidence || 'low',
        date: date || new Date().toISOString().split('T')[0]
      };
    }).filter(d => d.brightness > 0);
    
    // Calculate statistics
    const brightnessValues = data.map(d => d.brightness);
    const avgBrightness = brightnessValues.length > 0 ? 
      brightnessValues.reduce((a, b) => a + b, 0) / brightnessValues.length : 15.3;
    const maxBrightness = brightnessValues.length > 0 ? Math.max(...brightnessValues) : 85.2;
    const minBrightness = brightnessValues.length > 0 ? Math.min(...brightnessValues) : 0.5;
    
    res.json({
      source: 'NASA VIIRS Nighttime Lights (NOAA-20)',
      year: year || 2023,
      month: month || 'annual',
      date: new Date().toISOString(),
      count: data.length,
      avg_brightness: avgBrightness.toFixed(2),
      min_brightness: minBrightness.toFixed(2),
      max_brightness: maxBrightness.toFixed(2),
      std_dev: calculateStdDev(brightnessValues).toFixed(2),
      data: data.slice(0, 1000) // Limit for performance
    });
    
  } catch (error) {
    console.error('❌ NASA VIIRS Error:', error.message);
    
    // Use enhanced dataset as fallback if available
    let LightPollutionData;
    try {
      LightPollutionData = require('../data/light-pollution-data');
    } catch (loadError) {
      console.log('Enhanced dataset not available for fallback');
    }
    
    if (LightPollutionData) {
      try {
        const bounds = req.query.bbox ? req.query.bbox.split(',').map(Number) : [30, -120, 50, -60];
        const [minLat, minLon, maxLat, maxLon] = bounds;
        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLon + maxLon) / 2;
        
        const enhancedData = LightPollutionData.getLightPollutionData(centerLat, centerLng, {
          radius: Math.min(2, Math.max(0.1, (maxLat - minLat) / 2))
        });
        
        // Transform the enhanced data to match VIIRS format
        const transformedData = enhancedData.data.map(point => ({
          lat: point.lat,
          lng: point.lng,
          brightness: 21.8 - (point.brightness * 0.8), // Convert SQM to VIIRS-like brightness
          frp: (22.5 - point.brightness) * 0.5, // Fire Radiative Power equivalent
          confidence: point.confidence === 'high' ? 90 : 50,
          date: point.timestamp,
          source: 'Enhanced Light Pollution Dataset'
        }));
        
        return res.json({
          source: 'Enhanced Light Pollution Dataset (VIIRS Equivalent - Fallback)',
          year: year || 2023,
          month: month || 'annual',
          date: new Date().toISOString(),
          count: transformedData.length,
          avg_brightness: enhancedData.summary.avg_sqm,
          min_brightness: enhancedData.summary.min_sqm,
          max_brightness: enhancedData.summary.max_sqm,
          std_dev: calculateStdDev(transformedData.map(d => d.brightness)).toFixed(2),
          data: transformedData,
          metadata: {
            enhanced_dataset: true,
            fallback_used: true,
            citations: enhancedData.metadata.citations
          }
        });
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError.message);
      }
    }
    
    // Final fallback - sample data
    res.status(500).json({
      error: 'Failed to fetch VIIRS data',
      message: 'Could not retrieve data from NASA API. Please check your connection and API key.',
      year: year || 2023,
      month: month || 'annual',
      source: 'Sample Data (API Failure)',
      data: generateSampleVIIRSData(req.query.bbox)
    });
  }
}

module.exports = router;