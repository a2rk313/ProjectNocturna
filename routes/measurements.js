// routes/measurements.js - Measurement routes
const express = require('express');
const router = express.Router();
const MeasurementController = require('../controllers/measurementController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validate, validators } = require('../middleware/validation');

// Apply API usage tracking middleware to all measurement routes
router.use(MeasurementController.trackAPIUsage);

// Public routes (with optional auth for enhanced features)
router.get('/', optionalAuth, MeasurementController.getMeasurementsByLocation);
router.get('/by-date-range', optionalAuth, MeasurementController.getMeasurementsByDateRange);
router.get('/statistics', optionalAuth, MeasurementController.getStatisticsByLocation);
router.get('/trends', optionalAuth, MeasurementController.getTrendAnalysis);

// Protected routes (require authentication)
router.post('/', authenticateToken, validate(validators.measurement), MeasurementController.createMeasurement);

module.exports = router;