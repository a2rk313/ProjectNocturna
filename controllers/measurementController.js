// controllers/measurementController.js - Measurement controller
const MeasurementService = require('../services/measurementService');
const { logger } = require('../config/db');
const moment = require('moment');

class MeasurementController {
  static async createMeasurement(req, res) {
    try {
      const measurementData = req.body;
      const userId = req.user?.id; // Optional - if authenticated

      // Validate required fields
      if (!measurementData.sqmReading || !measurementData.location) {
        return res.status(400).json({ error: 'SQM reading and location are required' });
      }

      const measurement = await MeasurementService.createMeasurement(measurementData, userId);

      res.status(201).json({
        message: 'Measurement created successfully',
        measurement
      });
    } catch (error) {
      logger.error('Create measurement error:', error);
      res.status(500).json({ error: 'Failed to create measurement', details: error.message });
    }
  }

  static async getMeasurementsByLocation(req, res) {
    try {
      const { lat, lng, radius } = req.query;
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const radiusKm = parseFloat(radius) || 10;

      // Validate inputs
      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ error: 'Valid latitude and longitude are required' });
      }

      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json({ error: 'Invalid coordinate values' });
      }

      if (radiusKm <= 0 || radiusKm > 100) {
        return res.status(400).json({ error: 'Radius must be between 1 and 100 km' });
      }

      const measurements = await MeasurementService.getMeasurementsByLocation(latitude, longitude, radiusKm);

      res.json({
        count: measurements.length,
        measurements
      });
    } catch (error) {
      logger.error('Get measurements by location error:', error);
      res.status(500).json({ error: 'Failed to fetch measurements', details: error.message });
    }
  }

  static async getMeasurementsByDateRange(req, res) {
    try {
      const { startDate, endDate, limit } = req.query;
      
      // Validate dates
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required' });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      const limitNum = parseInt(limit) || 1000;

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }

      if (start > end) {
        return res.status(400).json({ error: 'Start date must be before end date' });
      }

      const measurements = await MeasurementService.getMeasurementsByDateRange(start, end, limitNum);

      res.json({
        count: measurements.length,
        measurements
      });
    } catch (error) {
      logger.error('Get measurements by date range error:', error);
      res.status(500).json({ error: 'Failed to fetch measurements', details: error.message });
    }
  }

  static async getStatisticsByLocation(req, res) {
    try {
      const { lat, lng, radius, startDate, endDate } = req.query;
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const radiusKm = parseFloat(radius) || 10;

      // Validate inputs
      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ error: 'Valid latitude and longitude are required' });
      }

      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json({ error: 'Invalid coordinate values' });
      }

      // Parse optional dates
      let start = null;
      let end = null;

      if (startDate) {
        start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json({ error: 'Invalid start date format' });
        }
      }

      if (endDate) {
        end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return res.status(400).json({ error: 'Invalid end date format' });
        }
      }

      const stats = await MeasurementService.getStatisticsByLocation(latitude, longitude, radiusKm, start, end);

      res.json({
        location: { latitude, longitude, radiusKm },
        dateRange: { startDate: start, endDate: end },
        statistics: stats
      });
    } catch (error) {
      logger.error('Get statistics by location error:', error);
      res.status(500).json({ error: 'Failed to fetch statistics', details: error.message });
    }
  }

  static async getTrendAnalysis(req, res) {
    try {
      const { lat, lng, radius, timeWindow } = req.query;
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const radiusKm = parseFloat(radius) || 10;
      const timeWindowDays = parseInt(timeWindow) || 365;

      // Validate inputs
      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ error: 'Valid latitude and longitude are required' });
      }

      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json({ error: 'Invalid coordinate values' });
      }

      if (timeWindowDays <= 0 || timeWindowDays > 3650) { // Max 10 years
        return res.status(400).json({ error: 'Time window must be between 1 and 3650 days' });
      }

      const trends = await MeasurementService.getTrendAnalysis(latitude, longitude, radiusKm, timeWindowDays);

      res.json({
        location: { latitude, longitude, radiusKm },
        timeWindowDays,
        trends
      });
    } catch (error) {
      logger.error('Get trend analysis error:', error);
      res.status(500).json({ error: 'Failed to fetch trend analysis', details: error.message });
    }
  }

  static async trackAPIUsage(req, res, next) {
    // Track API usage for commercial features
    try {
      const userId = req.user?.id;
      const endpoint = req.originalUrl;
      const startTime = Date.now();

      // Continue with the request
      res.on('finish', async () => {
        const processingTime = Date.now() - startTime;
        const responseSize = res.getHeader('Content-Length') || 0;

        // Only track if user is authenticated
        if (userId) {
          await require('../config/db').query(
            `INSERT INTO api_usage (user_id, endpoint, response_size, processing_time_ms) 
             VALUES ($1, $2, $3, $4)`,
            [userId, endpoint, responseSize, processingTime]
          );
        }
      });

      next();
    } catch (error) {
      logger.error('API usage tracking error:', error);
      next(); // Continue with request even if tracking fails
    }
  }
}

module.exports = MeasurementController;