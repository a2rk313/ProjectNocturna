// routes/dark-sky-parks.js - International Dark-Sky Association routes
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Load dark sky parks data if available
let darkSkyParksData = null;
try {
  const dataPath = path.join(__dirname, '../data/dark-sky-parks.json');
  if (fs.existsSync(dataPath)) {
    darkSkyParksData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  }
} catch (error) {
  console.log('⚠️ Dark Sky Parks data not found, loading from API directory');
  // Try loading from the API directory
  try {
    const apiDataPath = path.join(__dirname, '../api/dark-sky-parks.json');
    if (fs.existsSync(apiDataPath)) {
      darkSkyParksData = JSON.parse(fs.readFileSync(apiDataPath, 'utf8'));
    }
  } catch (apiError) {
    console.log('⚠️ Dark Sky Parks data not found in API directory either');
  }
}

// Get all dark sky parks
router.get('/', async (req, res) => {
  try {
    const { lat, lng, radius, designation, country } = req.query;
    
    console.log(`🌌 Dark Sky Parks Request: coordinates=${lat},${lng}, radius=${radius}, designation=${designation}, country=${country}`);
    
    // If we have actual dark sky parks data, use it
    if (darkSkyParksData) {
      let filteredData = darkSkyParksData;
      
      // Apply location filter if coordinates provided
      if (lat && lng) {
        const centerLat = parseFloat(lat);
        const centerLng = parseFloat(lng);
        const searchRadius = parseFloat(radius) || 500; // Default to 500 km
        
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
      
      // Apply designation filter if provided
      if (designation) {
        filteredData = filteredData.filter(item => 
          item.designation && 
          item.designation.toLowerCase().includes(designation.toLowerCase())
        );
      }
      
      // Apply country filter if provided
      if (country) {
        filteredData = filteredData.filter(item => 
          item.country && 
          item.country.toLowerCase().includes(country.toLowerCase())
        );
      }
      
      return res.json({
        source: 'International Dark-Sky Association - Certified Places',
        count: filteredData.length,
        data: filteredData,
        metadata: {
          data_provider: 'International Dark-Sky Association',
          reference: 'https://www.darksky.org/',
          updated_date: new Date().toISOString(),
          total_certified_places: darkSkyParksData.length
        }
      });
    }
    
    // Sample data for fallback
    const sampleData = [
      {
        id: 1,
        name: 'Cherry Springs State Park',
        designation: 'International Dark Sky Park',
        country: 'United States',
        state: 'Pennsylvania',
        lat: 41.3855,
        lng: -77.9753,
        area_sq_km: 85,
        certification_year: 2008,
        description: 'One of the darkest places on the East Coast',
        website: 'https://www.dcnr.pa.gov/StateParks/FindAPark/CherrySprings/Pages/default.aspx',
        sqm_range: [21.2, 22.0],
        best_season: 'Fall and Spring',
        facilities: ['Visitor Center', 'Astronomy Field', 'Restrooms'],
        restrictions: 'Seasonal vehicle restrictions during astronomy hours'
      },
      {
        id: 2,
        name: 'Natural Bridges National Monument',
        designation: 'International Dark Sky Park',
        country: 'United States',
        state: 'Utah',
        lat: 37.5874,
        lng: -110.0745,
        area_sq_km: 76,
        certification_year: 2007,
        description: 'First place certified as an International Dark Sky Park',
        website: 'https://www.nps.gov/nhub/index.htm',
        sqm_range: [21.5, 22.1],
        best_season: 'Year-round',
        facilities: ['Visitor Center', 'Hiking Trails', 'Camping'],
        restrictions: 'Night sky programs require advance registration'
      },
      {
        id: 3,
        name: 'Pic du Midi',
        designation: 'International Dark Sky Reserve',
        country: 'France',
        state: 'Midi-Pyrénées',
        lat: 42.9423,
        lng: 0.1434,
        area_sq_km: 300,
        certification_year: 2013,
        description: 'Mountain observatory with exceptional skies',
        website: 'https://www.picdumidi.com/',
        sqm_range: [21.8, 22.4],
        best_season: 'Summer',
        facilities: ['Observatory', 'Hotel', 'Restaurant'],
        restrictions: 'Requires cable car access'
      }
    ];
    
    res.json({
      source: 'International Dark-Sky Association - Certified Places (Sample Data)',
      count: sampleData.length,
      data: sampleData,
      metadata: {
        data_provider: 'International Dark-Sky Association',
        reference: 'https://www.darksky.org/',
        note: 'This is sample data. For real data, please provide dark sky parks data file.',
        updated_date: new Date().toISOString(),
        total_certified_places: sampleData.length
      }
    });
  } catch (error) {
    console.error('❌ Dark Sky Parks Error:', error.message);
    res.status(500).json({
      error: 'Failed to process Dark Sky Parks request',
      message: error.message
    });
  }
});

// Get a specific dark sky park by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (darkSkyParksData) {
      const park = darkSkyParksData.find(item => 
        String(item.id) === String(id) || 
        item.name?.toLowerCase().replace(/\s+/g, '-') === id.toLowerCase().replace(/\s+/g, '-')
      );
      
      if (park) {
        return res.json({
          source: 'International Dark-Sky Association - Certified Place',
          data: park,
          metadata: {
            data_provider: 'International Dark-Sky Association',
            reference: 'https://www.darksky.org/',
            updated_date: new Date().toISOString()
          }
        });
      }
    }
    
    // Return sample data for the requested ID
    const samplePark = {
      id: parseInt(id) || 1,
      name: `Sample Dark Sky Park ${id}`,
      designation: 'International Dark Sky Park',
      country: 'United States',
      state: 'Sample State',
      lat: 39.8283 + (Math.random() - 0.5) * 10,
      lng: -98.5795 + (Math.random() - 0.5) * 20,
      area_sq_km: Math.floor(50 + Math.random() * 200),
      certification_year: 2010 + Math.floor(Math.random() * 14),
      description: 'Sample description for dark sky park',
      website: 'https://example.com',
      sqm_range: [21.0 + Math.random() * 1.5, 21.5 + Math.random() * 1.0],
      best_season: ['Spring', 'Summer', 'Fall', 'Winter'][Math.floor(Math.random() * 4)],
      facilities: ['Facility A', 'Facility B'],
      restrictions: 'Sample restrictions'
    };
    
    res.json({
      source: 'International Dark-Sky Association - Certified Place (Sample)',
      data: samplePark,
      metadata: {
        data_provider: 'International Dark-Sky Association',
        reference: 'https://www.darksky.org/',
        note: 'This is sample data. For real data, please provide dark sky parks data file.',
        updated_date: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Dark Sky Park Detail Error:', error.message);
    res.status(500).json({
      error: 'Failed to process Dark Sky Park detail request',
      message: error.message
    });
  }
});

module.exports = router;