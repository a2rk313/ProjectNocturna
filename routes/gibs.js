// routes/gibs.js - GIBS (Global Imagery Browse Services) API routes
const express = require('express');
const router = express.Router();

// Mock GIBS layers endpoint
router.get('/layers', (req, res) => {
  try {
    const mockLayers = {
      status: 'success',
      layers: [
        {
          id: 'VIIRS_SNPP_CorrectedReflectance_TrueColor',
          title: 'VIIRS Day/Night Band, Corrected Reflectance (True Color)',
          description: 'NASA VIIRS imagery showing true color representation'
        },
        {
          id: 'MODIS_Terra_CorrectedReflectance_TrueColor', 
          title: 'MODIS Terra, Corrected Reflectance (True Color)',
          description: 'MODIS Terra satellite imagery'
        },
        {
          id: 'BlackMarble_2016',
          title: 'Black Marble Nighttime Lights 2016',
          description: 'NASA Black Marble nighttime lights composite'
        },
        {
          id: 'LightPollution',
          title: 'Light Pollution Data',
          description: 'Global light pollution dataset'
        }
      ],
      timestamp: new Date().toISOString()
    };
    
    res.json(mockLayers);
  } catch (error) {
    console.error('GIBS layers error:', error);
    res.status(500).json({
      error: 'Failed to fetch GIBS layers',
      message: error.message
    });
  }
});

module.exports = router;