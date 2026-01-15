// services/citizenScienceService.js
import db from '../lib/db';

export async function getCitizenObservations(limit = 50) {
  try {
    const query = `
      SELECT 
        id,
        location,
        measurement_value,
        measurement_unit,
        timestamp,
        user_id,
        ST_AsGeoJSON(geometry) as geometry
      FROM citizen_observations 
      ORDER BY timestamp DESC 
      LIMIT $1
    `;
    const result = await db.any(query, [limit]);
    
    // Parse geometries from GeoJSON strings
    return result.map(row => ({
      ...row,
      geometry: JSON.parse(row.geometry)
    }));
  } catch (error) {
    console.error('Error fetching citizen observations:', error);
    throw error;
  }
}

export async function submitCitizenObservation(observation) {
  try {
    const {
      location,
      measurement_value,
      measurement_unit = 'lux',
      timestamp = new Date(),
      user_id = null,
      notes = ''
    } = observation;

    if (!location || typeof measurement_value !== 'number') {
      throw new Error('Location and measurement value are required');
    }

    // Insert the observation into the database
    const insertQuery = `
      INSERT INTO citizen_observations (
        location,
        measurement_value,
        measurement_unit,
        timestamp,
        user_id,
        notes,
        geometry
      ) VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($7, $8), 4326))
      RETURNING id, timestamp
    `;

    const result = await db.one(insertQuery, [
      location.name || 'Unknown Location',
      measurement_value,
      measurement_unit,
      timestamp,
      user_id,
      notes,
      location.longitude || location.lng || location.lon,
      location.latitude || location.lat
    ]);

    return result;
  } catch (error) {
    console.error('Error submitting citizen observation:', error);
    throw error;
  }
}

export async function getObservationsByUser(userId) {
  try {
    const query = `
      SELECT 
        id,
        location,
        measurement_value,
        measurement_unit,
        timestamp,
        notes,
        ST_AsGeoJSON(geometry) as geometry
      FROM citizen_observations 
      WHERE user_id = $1
      ORDER BY timestamp DESC
    `;
    const result = await db.any(query, [userId]);
    
    return result.map(row => ({
      ...row,
      geometry: JSON.parse(row.geometry)
    }));
  } catch (error) {
    console.error('Error fetching observations by user:', error);
    throw error;
  }
}

export async function getObservationsNearLocation(lat, lng, radiusInMeters = 1000) {
  try {
    const query = `
      SELECT 
        id,
        location,
        measurement_value,
        measurement_unit,
        timestamp,
        user_id,
        notes,
        ST_AsGeoJSON(geometry) as geometry,
        ST_Distance(
          geometry, 
          ST_SetSRID(ST_MakePoint($1, $2), 4326)
        ) AS distance
      FROM citizen_observations
      WHERE ST_DWithin(
        geometry, 
        ST_SetSRID(ST_MakePoint($1, $2), 4326), 
        $3
      )
      ORDER BY distance
      LIMIT 50
    `;
    const result = await db.any(query, [lng, lat, radiusInMeters]);
    
    return result.map(row => ({
      ...row,
      geometry: JSON.parse(row.geometry),
      distance: parseFloat(row.distance)
    }));
  } catch (error) {
    console.error('Error fetching observations near location:', error);
    throw error;
  }
}