// services/measurementService.js - Light pollution measurement service
const { query, logger } = require('../config/db');
const turf = require('@turf/turf');

class MeasurementService {
  static async createMeasurement(measurementData, userId = null) {
    try {
      const {
        sqmReading,
        bortleClass,
        location,
        deviceType,
        notes,
        altitude,
        humidity,
        temperature,
        moonPhase,
        cloudCover
      } = measurementData;

      const result = await query(
        `INSERT INTO light_measurements (
          sqm_reading, bortle_class, geom, device_type, notes, 
          altitude, humidity, temperature, moon_phase, cloud_cover, 
          created_by_user_id, source
        )
        VALUES (
          $1, $2, ST_SetSRID(ST_Point($3, $4), 4326), $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13
        )
        RETURNING id, sqm_reading, bortle_class, created_at`,
        [
          sqmReading,
          bortleClass,
          location.longitude,
          location.latitude,
          deviceType || 'unknown',
          notes || null,
          altitude || null,
          humidity || null,
          temperature || null,
          moonPhase || null,
          cloudCover || null,
          userId,
          'user_submission'
        ]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating measurement:', error);
      throw error;
    }
  }

  static async getMeasurementsByLocation(latitude, longitude, radiusKm = 10) {
    try {
      // Convert radius from km to degrees (approximate)
      const radiusDegrees = radiusKm / 111.045; // Rough conversion (1 degree ≈ 111 km)

      const result = await query(
        `SELECT 
          id, sqm_reading, bortle_class, 
          ST_X(geom) as longitude, 
          ST_Y(geom) as latitude,
          device_type, notes, created_at,
          altitude, humidity, temperature, moon_phase, cloud_cover
        FROM light_measurements
        WHERE ST_DWithin(
          geom::geography, 
          ST_SetSRID(ST_Point($1, $2), 4326)::geography, 
          $3 * 1000  -- Convert km to meters
        )
        ORDER BY created_at DESC
        LIMIT 100`,
        [longitude, latitude, radiusKm]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting measurements by location:', error);
      throw error;
    }
  }

  static async getMeasurementsByDateRange(startDate, endDate, limit = 1000) {
    try {
      const result = await query(
        `SELECT 
          id, sqm_reading, bortle_class,
          ST_X(geom) as longitude, 
          ST_Y(geom) as latitude,
          device_type, notes, created_at,
          altitude, humidity, temperature, moon_phase, cloud_cover
        FROM light_measurements
        WHERE created_at BETWEEN $1 AND $2
        ORDER BY created_at DESC
        LIMIT $3`,
        [startDate, endDate, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting measurements by date range:', error);
      throw error;
    }
  }

  static async getStatisticsByLocation(latitude, longitude, radiusKm = 10, startDate = null, endDate = null) {
    try {
      const radiusDegrees = radiusKm / 111.045;

      let queryText = `
        SELECT 
          COUNT(*) as total_measurements,
          AVG(sqm_reading) as avg_sqm,
          MIN(sqm_reading) as min_sqm,
          MAX(sqm_reading) as max_sqm,
          STDDEV(sqm_reading) as stddev_sqm,
          AVG(bortle_class) as avg_bortle,
          MIN(created_at) as earliest_measurement,
          MAX(created_at) as latest_measurement
        FROM light_measurements
        WHERE ST_DWithin(
          geom::geography, 
          ST_SetSRID(ST_Point($1, $2), 4326)::geography, 
          $3 * 1000
        )`;

      const queryParams = [longitude, latitude, radiusKm];

      if (startDate && endDate) {
        queryText += ` AND created_at BETWEEN $4 AND $5`;
        queryParams.push(startDate, endDate);
      }

      const result = await query(queryText, queryParams);

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting statistics by location:', error);
      throw error;
    }
  }

  static async getTrendAnalysis(latitude, longitude, radiusKm = 10, timeWindowDays = 365) {
    try {
      const radiusDegrees = radiusKm / 111.045;
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - timeWindowDays * 24 * 60 * 60 * 1000);

      const result = await query(`
        WITH monthly_stats AS (
          SELECT 
            DATE_TRUNC('month', created_at) as month,
            AVG(sqm_reading) as avg_sqm,
            COUNT(*) as measurement_count
          FROM light_measurements
          WHERE ST_DWithin(
            geom::geography, 
            ST_SetSRID(ST_Point($1, $2), 4326)::geography, 
            $3 * 1000
          )
          AND created_at >= $4
          GROUP BY DATE_TRUNC('month', created_at)
          ORDER BY month
        )
        SELECT * FROM monthly_stats`,
        [longitude, latitude, radiusKm, startDate]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting trend analysis:', error);
      throw error;
    }
  }
}

module.exports = MeasurementService;