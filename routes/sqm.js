// routes/sqm.js - Global SQM Network routes
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Load SQM network data if available
let sqmNetworkData = null;
try {
  const dataPath = path.join(__dirname, '../data/sqm-network-data.json');
  if (fs.existsSync(dataPath)) {
    sqmNetworkData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  }
} catch (error) {
  console.log('⚠️ SQM Network data not found, using sample data');
}

// Get real-time SQM network data
router.get('/', async (req, res) => {
  try {
    const { lat, lng, radius, dateFrom, dateTo } = req.query;
    
    console.log(`📡 SQM Network Request: coordinates=${lat},${lng}, radius=${radius}`);
    
    // If we have actual SQM network data, use it
    if (sqmNetworkData) {
      let filteredData = sqmNetworkData;
      
      // Apply location filter if coordinates provided
      if (lat && lng) {
        const centerLat = parseFloat(lat);
        const centerLng = parseFloat(lng);
        const searchRadius = parseFloat(radius) || 50; // Default to 50 km
        
        filteredData = filteredData.filter(item => {
          if (!item.lat || !item.lng) return false;
          
          // Calculate approximate distance (simplified)
          const latDiff = Math.abs(item.lat - centerLat);
          const lngDiff = Math.abs(item.lng - centerLng);
          
          // Convert to approximate km difference (rough estimation)
          const latKm = latDiff * 111; // 1 degree ~ 111 km
          const lngKm = lngDiff * (111 * Math.cos(centerLat * Math.PI / 180)); // Adjust for longitude
          
          return Math.sqrt(Math.pow(latKm, 2) + Math.pow(lngKm, 2)) <= searchRadius;
        });
      }
      
      // Apply date filters if provided
      if (dateFrom || dateTo) {
        filteredData = filteredData.filter(item => {
          const itemDate = new Date(item.date_measured || item.timestamp || Date.now());
          const fromDate = dateFrom ? new Date(dateFrom) : new Date(0);
          const toDate = dateTo ? new Date(dateTo) : new Date();
          
          return itemDate >= fromDate && itemDate <= toDate;
        });
      }
      
      // Calculate statistics
      const brightnessValues = filteredData.map(item => item.sqm_value).filter(val => val);
      const avgBrightness = brightnessValues.length > 0 ? 
        brightnessValues.reduce((sum, val) => sum + val, 0) / brightnessValues.length : 0;
      
      return res.json({
        source: 'Global SQM Network',
        count: filteredData.length,
        avg_brightness: parseFloat(avgBrightness.toFixed(2)),
        data: filteredData.slice(0, 100), // Limit for performance
        metadata: {
          network_type: 'Global SQM Network',
          data_provider: 'Ground-based Sky Quality Measurements',
          units: 'Sky Quality Meter (SQM) readings',
          processed_date: new Date().toISOString()
        }
      });
    }
    
    // Sample data for fallback
    const sampleData = [];
    const count = 25;
    
    // Generate sample SQM data around a center point if provided
    const centerLat = parseFloat(lat) || 39.8283; // Default to US center
    const centerLng = parseFloat(lng) || -98.5795;
    
    for (let i = 0; i < count; i++) {
      // Random offset from center
      const offsetLat = (Math.random() - 0.5) * 2; // ±1 degree
      const offsetLng = (Math.random() - 0.5) * 2; // ±1 degree
      
      sampleData.push({
        id: i + 1,
        station_id: `STN_${String(i + 1).padStart(3, '0')}`,
        name: `Sample Station ${i + 1}`,
        lat: parseFloat((centerLat + offsetLat).toFixed(4)),
        lng: parseFloat((centerLng + offsetLng).toFixed(4)),
        sqm_value: 16 + Math.random() * 5, // SQM values typically 16-21
        date_measured: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        elevation: Math.floor(100 + Math.random() * 3000), // Elevation in meters
        observer: `Observer_${String(i + 1).padStart(3, '0')}`,
        equipment: 'SQM-LU',
        conditions: ['Clear', 'Partly Cloudy', 'Hazy'][Math.floor(Math.random() * 3)],
        confidence: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)]
      });
    }
    
    // Calculate average brightness
    const avgBrightness = sampleData.reduce((sum, item) => sum + item.sqm_value, 0) / sampleData.length;
    
    res.json({
      source: 'Global SQM Network (Sample Data)',
      count: sampleData.length,
      avg_brightness: parseFloat(avgBrightness.toFixed(2)),
      data: sampleData,
      metadata: {
        network_type: 'Global SQM Network',
        data_provider: 'Ground-based Sky Quality Measurements',
        units: 'Sky Quality Meter (SQM) readings',
        note: 'This is sample data. For real data, please provide SQM network data file.',
        processed_date: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ SQM Network Error:', error.message);
    res.status(500).json({
      error: 'Failed to process SQM Network request',
      message: error.message
    });
  }
});

module.exports = router;