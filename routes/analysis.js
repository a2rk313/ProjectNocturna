// routes/analysis.js
const express = require('express');
const router = express.Router();
const AnalysisController = require('../controllers/analysisController');
const { optionalAuth } = require('../middleware/auth'); // Assuming you have this middleware

// Route to trigger trend analysis
router.post('/trends', optionalAuth, AnalysisController.runTrendAnalysis);

module.exports = router;
