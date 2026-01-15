// services/lightPollutionService.js
import db from '../lib/db';

export async function getLightPollutionData(limit = 100) {
  try {
    const query = `
      SELECT 
        id,
        location,
        measurement_value,
        measurement_unit,
        timestamp,
        ST_AsGeoJSON(geometry) as geometry
      FROM light_pollution_data 
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
    console.error('Error fetching light pollution data:', error);
    throw error;
  }
}

export async function getLightPollutionStats() {
  try {
    const countQuery = 'SELECT COUNT(*) as total FROM light_pollution_data';
    const avgQuery = 'SELECT AVG(measurement_value) as average FROM light_pollution_data';
    const recentQuery = 'SELECT MAX(timestamp) as latest FROM light_pollution_data';
    
    const [countResult, avgResult, recentResult] = await Promise.all([
      db.one(countQuery),
      db.one(avgQuery),
      db.one(recentQuery)
    ]);
    
    return {
      totalRecords: parseInt(countResult.total),
      averageMeasurement: parseFloat(avgResult.average) || 0,
      latestRecordDate: recentResult.latest
    };
  } catch (error) {
    console.error('Error fetching light pollution stats:', error);
    throw error;
  }
}

export async function getLightPollutionByLocation(city, country) {
  try {
    let query = 'SELECT * FROM light_pollution_data WHERE ';
    const params = [];
    
    if (city) {
      query += 'city = $1';
      params.push(city);
      
      if (country) {
        query += ' AND country = $2';
        params.push(country);
      }
    } else if (country) {
      query += 'country = $1';
      params.push(country);
    } else {
      throw new Error('Either city or country must be provided');
    }
    
    query += ' ORDER BY timestamp DESC LIMIT 50';
    
    return await db.any(query, params);
  } catch (error) {
    console.error('Error fetching light pollution data by location:', error);
    throw error;
  }
}