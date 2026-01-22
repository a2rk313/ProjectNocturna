// controllers/analysisController.js
const { runTrendAnalysis } = require('../scripts/analyze-trends');
const { logger } = require('../config/db');

class AnalysisController {
  static async runTrendAnalysis(req, res) {
    try {
      const { aoi } = req.body;

      // Validate AOI
      if (!aoi || !Array.isArray(aoi) || aoi.length !== 4) {
        return res.status(400).json({ error: 'Invalid AOI provided. It must be an array of 4 numbers.' });
      }

      // Further validation for bounds can be added here
      const [minLat, minLon, maxLat, maxLon] = aoi;
      if (minLat < -90 || maxLat > 90 || minLon < -180 || maxLon > 180) {
        return res.status(400).json({ error: 'Invalid AOI bounds.' });
      }

      logger.info(`Starting trend analysis for AOI: ${aoi}`);
      const result = await runTrendAnalysis(aoi);

      res.status(200).json(result);
    } catch (error) {
      logger.error('Run trend analysis error:', error);
      res.status(500).json({ error: 'Failed to run trend analysis', details: error.message });
    }
  }
}

module.exports = AnalysisController;
