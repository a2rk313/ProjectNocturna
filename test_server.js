// Minimal test server to verify API functionality
const express = require('express');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Import the light pollution data
const LightPollutionData = require('./data/light-pollution-data');

// Test endpoint for VIIRS data (simulating the original issue)
app.get('/api/viirs/:year', (req, res) => {
  try {
    const { year } = req.params;
    const { bbox } = req.query;
    
    console.log(`🌍 NASA VIIRS Request: year=${year}, bbox=${bbox}`);
    
    // Use our enhanced dataset if bbox is provided
    if (bbox) {
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
            month: 'annual',
            date: new Date().toISOString(),
            count: transformedData.length,
            avg_brightness: enhancedData.summary.avg_sqm,
            min_brightness: enhancedData.summary.min_sqm,
            max_brightness: enhancedData.summary.max_sqm,
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
        console.log('Enhanced dataset processing failed:', enhancedError.message);
      }
    }
    
    // Fallback to generating data based on coordinates
    const [minLon, minLat, maxLon, maxLat] = bbox ? bbox.split(',').map(Number) : [-10, 35, 10, 50];
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLon + maxLon) / 2;
    
    const enhancedData = LightPollutionData.getLightPollutionData(centerLat, centerLng, { radius: 1.0 });
    
    const transformedData = enhancedData.data.map(point => ({
      lat: point.lat,
      lng: point.lng,
      brightness: 21.8 - (point.brightness * 0.8),
      frp: (22.5 - point.brightness) * 0.5,
      confidence: point.confidence === 'high' ? 90 : 50,
      date: point.timestamp,
      source: 'Enhanced Light Pollution Dataset'
    }));

    res.json({
      source: 'Enhanced Light Pollution Dataset (VIIRS Equivalent)',
      year: year || 2023,
      month: 'annual',
      date: new Date().toISOString(),
      count: transformedData.length,
      avg_brightness: enhancedData.summary.avg_sqm,
      min_brightness: enhancedData.summary.min_sqm,
      max_brightness: enhancedData.summary.max_sqm,
      data: transformedData.slice(0, 1000),
      metadata: {
        enhanced_dataset: true,
        geographic_patterns_applied: true,
        closest_reference: enhancedData.summary.closest_reference,
        citations: enhancedData.metadata.citations
      }
    });
    
  } catch (error) {
    console.error('❌ VIIRS API Error:', error.message);
    res.status(500).json({ error: 'Failed to process VIIRS request', message: error.message });
  }
});

// Test endpoint for stations
app.get('/api/stations', (req, res) => {
  try {
    console.log('📊 Fetching station data...');
    
    // Generate sample stations using the light pollution data
    const stations = [
      { id: 1, lat: 40.7128, lng: -74.0060, sqm: 17.8, mag: 8, source: 'NYC Metropolitan', is_research_grade: true },
      { id: 2, lat: 34.0522, lng: -118.2437, sqm: 17.2, mag: 9, source: 'LA Basin', is_research_grade: true },
      { id: 3, lat: 37.6018, lng: -110.0137, sqm: 21.99, mag: 1, source: 'Natural Bridges', is_research_grade: true },
      { id: 4, lat: 51.5074, lng: -0.1278, sqm: 18.1, mag: 8, source: 'London Metro', is_research_grade: true }
    ];
    
    console.log(`✅ Found ${stations.length} stations`);
    res.json(stations);
    
  } catch (error) {
    console.error('Stations error:', error);
    res.status(500).json({ error: 'Failed to fetch stations', message: error.message });
  }
});

// Test endpoint for SQM network
app.get('/api/sqm-network', (req, res) => {
  try {
    console.log('📡 Fetching SQM-LE Network data...');
    
    // Generate sample SQM stations
    const sampleStations = [
      { id: 'nyc-001', lat: 40.7128, lng: -74.0060, sqm: 17.8, location: 'Central Park, NYC', altitude: 42, last_update: new Date().toISOString(), source: 'Global SQM-LE Network', is_research_grade: true },
      { id: 'la-001', lat: 34.0522, lng: -118.2437, sqm: 17.2, location: 'Griffith Observatory, LA', altitude: 300, last_update: new Date().toISOString(), source: 'Global SQM-LE Network', is_research_grade: true },
      { id: 'paris-001', lat: 48.8566, lng: 2.3522, sqm: 17.9, location: 'Eiffel Tower, Paris', altitude: 35, last_update: new Date().toISOString(), source: 'Global SQM-LE Network', is_research_grade: true }
    ];
    
    console.log(`✅ Fetched ${sampleStations.length} SQM stations`);
    
    res.json({
      count: sampleStations.length,
      stations: sampleStations,
      updated: new Date().toISOString(),
      source: 'Global SQM-LE Network'
    });
    
  } catch (error) {
    console.log('⚠️ SQM network failed, falling back to database...');
    
    // Database fallback
    const stations = [
      { id: 'db-001', lat: 37.6018, lng: -110.0137, sqm: 21.99, bortle_class: 1, measured_at: new Date().toISOString(), device_type: 'SQM-LE', is_research_grade: true, source: 'Project Nocturna Database' },
      { id: 'db-002', lat: 41.6631, lng: -77.8236, sqm: 21.80, bortle_class: 1, measured_at: new Date().toISOString(), device_type: 'SQM-LE', is_research_grade: true, source: 'Project Nocturna Database' }
    ];
    
    res.json({
      count: stations.length,
      stations: stations,
      updated: new Date().toISOString(),
      source: 'Project Nocturna Database'
    });
  }
});

// World atlas endpoint
app.get('/api/world-atlas', (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    // Calculate based on latitude (poles are darker, equator brighter)
    const latFactor = Math.abs(parseFloat(lat) || 45) / 90;
    const basePollution = 3 + (latFactor * 4); // Range 3-7 based on latitude
    const randomVariation = Math.random() * 2;
    const bortle = Math.min(9, Math.max(1, basePollution + randomVariation));
    const sqm = 21.58 - (bortle * 0.5);
    
    res.json({
      dataset: 'World Atlas of Artificial Night Sky Brightness',
      version: '2016',
      resolution: '1km',
      coverage: 'global',
      citation: 'Falchi, F., et al. (2016). The new world atlas of artificial night sky brightness.',
      bortle_class: Math.round(bortle),
      sqm_reading: sqm.toFixed(2),
      calculation_based_on: lat && lng ? 'latitude-based model' : 'global average'
    });
    
  } catch (error) {
    console.error('World Atlas error:', error);
    res.status(500).json({ error: 'Failed to fetch World Atlas data', message: error.message });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available:`);
  console.log(`   GET /api/viirs/2023?bbox=-74.25,40.5,-73.7,40.9`);
  console.log(`   GET /api/stations`);
  console.log(`   GET /api/sqm-network`);
  console.log(`   GET /api/world-atlas?lat=40.7128&lng=-74.0060`);
});