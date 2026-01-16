// services/lightPollutionService.js
import { 
  getRecentMeasurements, 
  getMeasurementsInBoundingBox, 
  insertLightMeasurement,
  getSatelliteData,
  getEnvironmentalContext,
  getUserStats,
  getLightPollutionTrend
} from '../lib/db';

/**
 * Get recent light pollution measurements
 * @param {number} limit - Number of records to return (default: 50)
 * @returns {Array} Array of light pollution measurements
 */
export async function getLightPollutionData(limit = 50) {
  try {
    return await getRecentMeasurements(limit);
  } catch (error) {
    console.error('Error fetching light pollution data:', error);
    throw error;
  }
}

/**
 * Get comprehensive light pollution statistics
 * @returns {Object} Statistics object with various metrics
 */
export async function getLightPollutionStats() {
  try {
    // We'll use a raw query to get aggregated statistics
    const { pool } = await import('../lib/db');
    
    const statsQuery = `
      SELECT 
        COUNT(*) as total_records,
        AVG(sky_brightness_mag_arcsec2) as average_brightness,
        MIN(sky_brightness_mag_arcsec2) as min_brightness,
        MAX(sky_brightness_mag_arcsec2) as max_brightness,
        MIN(measurement_datetime) as earliest_record,
        MAX(measurement_datetime) as latest_record
      FROM light_measurements
    `;
    
    const result = await pool.query(statsQuery);
    const stats = result.rows[0];
    
    return {
      totalRecords: parseInt(stats.total_records),
      averageBrightness: parseFloat(stats.average_brightness) || 0,
      minBrightness: parseFloat(stats.min_brightness) || null,
      maxBrightness: parseFloat(stats.max_brightness) || null,
      earliestRecordDate: stats.earliest_record,
      latestRecordDate: stats.latest_record
    };
  } catch (error) {
    console.error('Error fetching light pollution stats:', error);
    throw error;
  }
}

/**
 * Get light pollution measurements within a bounding box
 * @param {number} minLat - Minimum latitude
 * @param {number} maxLat - Maximum latitude
 * @param {number} minLng - Minimum longitude
 * @param {number} maxLng - Maximum longitude
 * @param {number} limit - Number of records to return (default: 100)
 * @returns {Array} Array of measurements within the bounding box
 */
export async function getLightPollutionByLocation(minLat, maxLat, minLng, maxLng, limit = 100) {
  try {
    return await getMeasurementsInBoundingBox(minLat, maxLat, minLng, maxLng, limit);
  } catch (error) {
    console.error('Error fetching light pollution data by location:', error);
    throw error;
  }
}

/**
 * Submit a new light pollution measurement
 * @param {Object} measurementData - Measurement data object
 * @returns {Object} The inserted measurement record
 */
export async function submitLightPollutionMeasurement(measurementData) {
  try {
    // Validate required fields
    if (!measurementData.latitude || !measurementData.longitude || measurementData.sky_brightness === undefined) {
      throw new Error('Missing required fields: latitude, longitude, and sky_brightness are required');
    }

    // Additional validation for values
    if (measurementData.latitude < -90 || measurementData.latitude > 90) {
      throw new Error('Latitude must be between -90 and 90');
    }
    
    if (measurementData.longitude < -180 || measurementData.longitude > 180) {
      throw new Error('Longitude must be between -180 and 180');
    }
    
    if (measurementData.cloud_cover !== undefined && 
        (measurementData.cloud_cover < 0 || measurementData.cloud_cover > 100)) {
      throw new Error('Cloud cover must be between 0 and 100');
    }

    return await insertLightMeasurement(measurementData);
  } catch (error) {
    console.error('Error submitting light pollution measurement:', error);
    throw error;
  }
}

/**
 * Get satellite light pollution data for a date range
 * @param {Date} dateFrom - Start date
 * @param {Date} dateTo - End date
 * @param {number} limit - Number of records to return (default: 100)
 * @returns {Array} Array of satellite light pollution data
 */
export async function getSatelliteLightPollutionData(dateFrom, dateTo, limit = 100) {
  try {
    return await getSatelliteData(dateFrom, dateTo, limit);
  } catch (error) {
    console.error('Error fetching satellite light pollution data:', error);
    throw error;
  }
}

/**
 * Get environmental context for a location
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radiusMeters - Search radius in meters (default: 1000)
 * @param {number} hoursBack - Hours back to search for data (default: 24)
 * @returns {Array} Array of environmental context data
 */
export async function getEnvironmentalContextForLocation(lat, lng, radiusMeters = 1000, hoursBack = 24) {
  try {
    return await getEnvironmentalContext(lat, lng, radiusMeters, hoursBack);
  } catch (error) {
    console.error('Error fetching environmental context:', error);
    throw error;
  }
}

/**
 * Get user statistics
 * @param {string} userId - User ID
 * @returns {Object} User statistics
 */
export async function getUserStatistics(userId) {
  try {
    return await getUserStats(userId);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    throw error;
  }
}

/**
 * Get light pollution trend for an area
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radiusMeters - Search radius in meters (default: 5000)
 * @param {number} daysBack - Days back to calculate trend (default: 30)
 * @returns {Array} Array of trend data
 */
export async function getLightPollutionTrendForArea(lat, lng, radiusMeters = 5000, daysBack = 30) {
  try {
    return await getLightPollutionTrend(lat, lng, radiusMeters, daysBack);
  } catch (error) {
    console.error('Error fetching light pollution trend:', error);
    throw error;
  }
}

/**
 * Calculate area statistics for light pollution
 * @param {number} minLat - Minimum latitude
 * @param {number} maxLat - Maximum latitude
 * @param {number} minLng - Minimum longitude
 * @param {number} maxLng - Maximum longitude
 * @param {Date} startDate - Start date for calculation
 * @param {Date} endDate - End date for calculation
 * @returns {Object} Statistics object with average, min, max, count
 */
export async function calculateAreaLightPollutionStatistics(minLat, maxLat, minLng, maxLng, startDate, endDate) {
  try {
    // First get all measurements in the bounding box
    const measurements = await getMeasurementsInBoundingBox(minLat, maxLat, minLng, maxLng, 10000);
    
    // Filter by date range if provided
    const filteredMeasurements = measurements.filter(measurement => {
      const measurementDate = new Date(measurement.measurement_datetime);
      return (!startDate || measurementDate >= startDate) && 
             (!endDate || measurementDate <= endDate);
    });
    
    if (filteredMeasurements.length === 0) {
      return {
        count: 0,
        average: null,
        min: null,
        max: null,
        stdDev: null
      };
    }
    
    // Calculate statistics
    const values = filteredMeasurements
      .map(m => parseFloat(m.sky_brightness_mag_arcsec2))
      .filter(v => !isNaN(v)); // Remove invalid values
    
    if (values.length === 0) {
      return {
        count: 0,
        average: null,
        min: null,
        max: null,
        stdDev: null
      };
    }
    
    const count = values.length;
    const sum = values.reduce((acc, val) => acc + val, 0);
    const average = sum / count;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Calculate standard deviation
    const squaredDifferences = values.map(value => Math.pow(value - average, 2));
    const avgSquaredDiff = squaredDifferences.reduce((acc, val) => acc + val, 0) / count;
    const stdDev = Math.sqrt(avgSquaredDiff);
    
    return {
      count,
      average: parseFloat(average.toFixed(2)),
      min: parseFloat(min.toFixed(2)),
      max: parseFloat(max.toFixed(2)),
      stdDev: parseFloat(stdDev.toFixed(2)),
      measurements: filteredMeasurements // Include the raw measurements
    };
  } catch (error) {
    console.error('Error calculating area statistics:', error);
    throw error;
  }
}