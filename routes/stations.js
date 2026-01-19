// routes/stations.js - Light pollution monitoring stations API routes
const express = require('express');
const router = express.Router();

// Mock stations endpoint
router.get('/', (req, res) => {
  try {
    const mockStations = {
      status: 'success',
      count: 25,
      stations: [
        {
          id: 1,
          name: 'Central Park Observatory',
          latitude: 40.7829,
          longitude: -73.9654,
          elevation: 42,
          country: 'USA',
          status: 'active',
          lastReading: new Date().toISOString(),
          sqmValue: 16.2,
          bortleClass: 8,
          type: 'SQM'
        },
        {
          id: 2,
          name: 'Grand Canyon Dark Sky Site',
          latitude: 36.1069,
          longitude: -112.1129,
          elevation: 2000,
          country: 'USA',
          status: 'active',
          lastReading: new Date().toISOString(),
          sqmValue: 21.8,
          bortleClass: 2,
          type: 'SQM-LE'
        },
        {
          id: 3,
          name: 'Mauna Kea Summit',
          latitude: 19.8206,
          longitude: -155.4681,
          elevation: 4206,
          country: 'USA',
          status: 'active',
          lastReading: new Date().toISOString(),
          sqmValue: 22.1,
          bortleClass: 1,
          type: 'Professional'
        },
        {
          id: 4,
          name: 'Atacama Desert Observatory',
          latitude: -24.6297,
          longitude: -70.0377,
          elevation: 2400,
          country: 'Chile',
          status: 'active',
          lastReading: new Date().toISOString(),
          sqmValue: 22.5,
          bortleClass: 1,
          type: 'Professional'
        },
        {
          id: 5,
          name: 'Sahara Remote Station',
          latitude: 25.0,
          longitude: 13.0,
          elevation: 300,
          country: 'Algeria',
          status: 'active',
          lastReading: new Date().toISOString(),
          sqmValue: 21.2,
          bortleClass: 3,
          type: 'SQM-LE'
        }
      ],
      timestamp: new Date().toISOString()
    };
    
    res.json(mockStations);
  } catch (error) {
    console.error('Stations error:', error);
    res.status(500).json({
      error: 'Failed to fetch stations',
      message: error.message
    });
  }
});

module.exports = router;