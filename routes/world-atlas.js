// routes/world-atlas.js - World Atlas of Artificial Night Sky Brightness routes
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Load world atlas data if available
let worldAtlasData = null;
try {
  const dataPath = path.join(__dirname, '../data/world-atlas-data.json');
  if (fs.existsSync(dataPath)) {
    worldAtlasData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  }
} catch (error) {
  console.log('⚠️ World Atlas data not found, using sample data');
}

// Get world atlas data for a region
router.get('/', async (req, res) => {
  try {
    const { region, lat, lng, radius } = req.query;
    
    console.log(`🌍 World Atlas Request: region=${region}, coordinates=${lat},${lng}, radius=${radius}`);
    
    // If we have actual world atlas data, use it
    if (worldAtlasData) {
      let filteredData = worldAtlasData;
      
      // Apply filters if provided
      if (region) {
        filteredData = worldAtlasData.filter(item => 
          item.region && item.region.toLowerCase().includes(region.toLowerCase())
        );
      }
      
      if (lat && lng) {
        const centerLat = parseFloat(lat);
        const centerLng = parseFloat(lng);
        const searchRadius = parseFloat(radius) || 10; // Default to 10 degrees
        
        filteredData = filteredData.filter(item => {
          if (!item.lat || !item.lng) return false;
          
          // Simple distance calculation (not exact, but sufficient for filtering)
          const latDiff = Math.abs(item.lat - centerLat);
          const lngDiff = Math.abs(item.lng - centerLng);
          
          return latDiff <= searchRadius && lngDiff <= searchRadius;
        });
      }
      
      return res.json({
        source: 'World Atlas of Artificial Night Sky Brightness',
        count: filteredData.length,
        data: filteredData.slice(0, 100), // Limit for performance
        metadata: {
          dataset_version: '2016',
          reference: 'Falchi, F., et al. (2016). The new world atlas of artificial night sky brightness. Science Advances, 2(6), e1600377.',
          processed_date: new Date().toISOString()
        }
      });
    }
    
    // Sample data for fallback
    const sampleData = [
      {
        id: 1,
        region: 'North America',
        lat: 39.8283,
        lng: -98.5795,
        brightness_level: 3, // 1-5 scale (1 = darkest, 5 = brightest)
        sqm_value: 18.5, // Sky Quality Meter reading
        date_measured: '2016-01-01',
        source: 'Falchi et al. 2016',
        confidence: 'high'
      },
      {
        id: 2,
        region: 'Europe',
        lat: 54.5260,
        lng: 15.2551,
        brightness_level: 4,
        sqm_value: 16.2,
        date_measured: '2016-01-01',
        source: 'Falchi et al. 2016',
        confidence: 'high'
      },
      {
        id: 3,
        region: 'Remote Area',
        lat: -20.2833,
        lng: -70.0667,
        brightness_level: 1,
        sqm_value: 21.6,
        date_measured: '2016-01-01',
        source: 'Falchi et al. 2016',
        confidence: 'high'
      }
    ];
    
    res.json({
      source: 'World Atlas of Artificial Night Sky Brightness (Sample Data)',
      count: sampleData.length,
      data: sampleData,
      metadata: {
        dataset_version: '2016',
        reference: 'Falchi, F., et al. (2016). The new world atlas of artificial night sky brightness. Science Advances, 2(6), e1600377.',
        note: 'This is sample data. For real data, please provide world atlas data file.',
        processed_date: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ World Atlas Error:', error.message);
    res.status(500).json({
      error: 'Failed to process World Atlas request',
      message: error.message
    });
  }
});

// Get world atlas data for a specific region
router.get('/:region', async (req, res) => {
  try {
    const { region } = req.params;
    
    if (worldAtlasData) {
      const regionData = worldAtlasData.filter(item => 
        item.region && item.region.toLowerCase().includes(region.toLowerCase())
      );
      
      return res.json({
        source: `World Atlas of Artificial Night Sky Brightness - ${region}`,
        region: region,
        count: regionData.length,
        data: regionData,
        metadata: {
          dataset_version: '2016',
          reference: 'Falchi, F., et al. (2016). The new world atlas of artificial night sky brightness. Science Advances, 2(6), e1600377.',
          processed_date: new Date().toISOString()
        }
      });
    }
    
    // Return sample data for the requested region
    res.json({
      source: `World Atlas of Artificial Night Sky Brightness - ${region} (Sample)`,
      region: region,
      count: 1,
      data: [{
        id: 1,
        region: region,
        lat: 0,
        lng: 0,
        brightness_level: 3,
        sqm_value: 18.0,
        date_measured: '2016-01-01',
        source: 'Falchi et al. 2016',
        confidence: 'medium'
      }],
      metadata: {
        dataset_version: '2016',
        reference: 'Falchi, F., et al. (2016). The new world atlas of artificial night sky brightness. Science Advances, 2(6), e1600377.',
        note: 'This is sample data. For real data, please provide world atlas data file.',
        processed_date: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ World Atlas Region Error:', error.message);
    res.status(500).json({
      error: 'Failed to process World Atlas region request',
      message: error.message
    });
  }
});

module.exports = router;