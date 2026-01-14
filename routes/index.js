// routes/index.js - Main API routes
const express = require('express');
const router = express.Router();

// Import specific route handlers
const viirsRoutes = require('./viirs');
const worldAtlasRoutes = require('./world-atlas');
const sqmRoutes = require('./sqm');
const darkSkyParkRoutes = require('./dark-sky-parks');
const geoserverRoutes = require('./geoserver');

// NASA VIIRS routes
router.use('/viirs', viirsRoutes);

// World Atlas routes
router.use('/world-atlas', worldAtlasRoutes);

// SQM Network routes
router.use('/sqm-network', sqmRoutes);

// Dark Sky Parks routes
router.use('/dark-sky-parks', darkSkyParkRoutes);

// GeoServer routes
router.use('/geoserver', geoserverRoutes);

// Additional API routes can be added here
router.get('/status', (req, res) => {
  res.json({
    status: 'API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;