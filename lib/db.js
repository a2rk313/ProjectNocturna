// lib/db.js - Database connection module for PostGIS
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 
                  `postgresql://${process.env.DB_USER || 'postgres'}:${
                    process.env.DB_PASSWORD || 'postgres'
                  }@${process.env.DB_HOST || 'localhost'}:${
                    process.env.DB_PORT || 5432
                  }/${process.env.DB_NAME || 'light_pollution_db'}`,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Drizzle ORM instance
export const db = drizzle(pool, { schema });

// Export the pool for raw queries if needed
export { pool };

// Health check function
export async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Example queries for light pollution data

// Get recent light pollution measurements
export async function getRecentMeasurements(limit = 50) {
  try {
    const query = `
      SELECT 
        id, 
        latitude, 
        longitude, 
        sky_brightness_mag_arcsec2,
        measurement_datetime,
        ST_AsGeoJSON(location) as location_geojson,
        cloud_cover_percentage,
        weather_conditions,
        moon_phase,
        validation_status
      FROM light_measurements 
      ORDER BY measurement_datetime DESC 
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching recent measurements:', error);
    throw error;
  }
}

// Get measurements within a bounding box
export async function getMeasurementsInBoundingBox(minLat, maxLat, minLng, maxLng, limit = 100) {
  try {
    const query = `
      SELECT 
        id,
        latitude,
        longitude,
        sky_brightness_mag_arcsec2,
        measurement_datetime,
        ST_AsGeoJSON(location) as location_geojson,
        cloud_cover_percentage,
        validation_status
      FROM light_measurements
      WHERE ST_Y(location) BETWEEN $1 AND $2
        AND ST_X(location) BETWEEN $3 AND $4
      ORDER BY measurement_datetime DESC
      LIMIT $5
    `;
    const result = await pool.query(query, [minLat, maxLat, minLng, maxLng, limit]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching measurements in bounding box:', error);
    throw error;
  }
}

// Insert a new light pollution measurement
export async function insertLightMeasurement(measurementData) {
  try {
    const query = `
      INSERT INTO light_measurements (
        latitude, 
        longitude, 
        location, 
        sky_brightness_mag_arcsec2,
        cloud_cover_percentage,
        weather_conditions,
        moon_phase,
        moon_altitude,
        sensor_type,
        observation_notes,
        image_url,
        measurement_quality_score,
        submitted_by_user_id
      )
      VALUES ($1, $2, ST_GeogFromText($3), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, uuid, measurement_datetime
    `;
    
    const result = await pool.query(query, [
      measurementData.latitude,
      measurementData.longitude,
      `POINT(${measurementData.longitude} ${measurementData.latitude})`,
      measurementData.sky_brightness,
      measurementData.cloud_cover,
      measurementData.weather_conditions,
      measurementData.moon_phase,
      measurementData.moon_altitude,
      measurementData.sensor_type,
      measurementData.observation_notes,
      measurementData.image_url,
      measurementData.quality_score || 0.5,
      measurementData.submitted_by_user_id
    ]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error inserting light measurement:', error);
    throw error;
  }
}

// Get satellite light pollution data for a specific date range
export async function getSatelliteData(dateFrom, dateTo, limit = 100) {
  try {
    const query = `
      SELECT 
        id,
        acquisition_date,
        latitude,
        longitude,
        radiance_value,
        satellite_source,
        ST_AsGeoJSON(location) as location_geojson
      FROM satellite_light_data
      WHERE acquisition_date BETWEEN $1 AND $2
      ORDER BY acquisition_date DESC
      LIMIT $3
    `;
    const result = await pool.query(query, [dateFrom, dateTo, limit]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching satellite data:', error);
    throw error;
  }
}

// Get environmental context for a location
export async function getEnvironmentalContext(lat, lng, radiusMeters = 1000, hoursBack = 24) {
  try {
    const query = `
      SELECT 
        id,
        temperature_celsius,
        humidity_percentage,
        atmospheric_pressure_hpa,
        wind_speed_ms,
        visibility_km,
        cloud_cover_percentage,
        urban_rural_classification,
        timestamp
      FROM environmental_context
      WHERE ST_DWithin(
        location, 
        ST_GeogFromText($1), 
        $2
      )
      AND timestamp >= NOW() - INTERVAL '$3 hours'
      ORDER BY timestamp DESC
      LIMIT 10
    `;
    const result = await pool.query(query, [
      `POINT(${lng} ${lat})`,
      radiusMeters,
      hoursBack
    ]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching environmental context:', error);
    throw error;
  }
}

// Get user statistics
export async function getUserStats(userId) {
  try {
    const query = `
      SELECT 
        u.username,
        u.role,
        u.expertise_level,
        COUNT(lm.id) as total_measurements,
        AVG(lm.sky_brightness_mag_arcsec2) as avg_brightness,
        MIN(lm.measurement_datetime) as first_measurement,
        MAX(lm.measurement_datetime) as latest_measurement
      FROM users u
      LEFT JOIN light_measurements lm ON u.uuid = lm.submitted_by_user_id
      WHERE u.uuid = $1
      GROUP BY u.username, u.role, u.expertise_level
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    throw error;
  }
}

// Get light pollution trend for an area
export async function getLightPollutionTrend(lat, lng, radiusMeters = 5000, daysBack = 30) {
  try {
    const query = `
      SELECT 
        DATE(measurement_datetime) as measurement_date,
        AVG(sky_brightness_mag_arcsec2) as avg_brightness,
        COUNT(*) as daily_count,
        MIN(sky_brightness_mag_arcsec2) as min_brightness,
        MAX(sky_brightness_mag_arcsec2) as max_brightness
      FROM light_measurements
      WHERE ST_DWithin(
        location, 
        ST_GeogFromText($1), 
        $2
      )
      AND measurement_datetime >= NOW() - INTERVAL '$3 days'
      GROUP BY DATE(measurement_datetime)
      ORDER BY measurement_date DESC
    `;
    const result = await pool.query(query, [
      `POINT(${lng} ${lat})`,
      radiusMeters,
      daysBack
    ]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching light pollution trend:', error);
    throw error;
  }
}

// Close the pool when the application exits
process.on('SIGINT', async () => {
  console.log('Closing database connection pool...');
  await pool.end();
  process.exit(0);
});