// pages/api/index.js
import nc from 'next-connect';
import db from '../../lib/db';
import { getLightPollutionData } from '../../services/lightPollutionService';
import { getCitizenObservations } from '../../services/citizenScienceService';

const handler = nc();

handler.get(async (req, res) => {
  try {
    // Handle various API endpoints based on the path
    const { path } = req.query;
    
    if (Array.isArray(path)) {
      // If path is an array, join it
      path = path.join('/');
    }
    
    if (!path) {
      return res.status(400).json({ error: 'Path parameter is required' });
    }
    
    // Handle different API endpoints
    if (path.startsWith('data')) {
      // Example: /api/data endpoint
      const result = await getLightPollutionData();
      return res.status(200).json(result);
    } else if (path.startsWith('stats')) {
      // Example: /api/stats endpoint
      const query = 'SELECT COUNT(*) as total FROM light_pollution_data';
      const result = await db.one(query);
      return res.status(200).json(result);
    } else if (path.startsWith('locations')) {
      // Example: /api/locations endpoint
      const query = 'SELECT DISTINCT city, country FROM light_pollution_data LIMIT 20';
      const result = await db.any(query);
      return res.status(200).json(result);
    } else if (path.startsWith('citizen-observations')) {
      // Example: /api/citizen-observations endpoint
      const result = await getCitizenObservations();
      return res.status(200).json(result);
    } else {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

handler.post(async (req, res) => {
  try {
    const { path } = req.query;
    
    if (Array.isArray(path)) {
      path = path.join('/');
    }
    
    if (!path) {
      return res.status(400).json({ error: 'Path parameter is required' });
    }
    
    // Handle POST requests for different endpoints
    if (path === 'submit-observation') {
      // Handle citizen science observation submission
      const { location, measurement, timestamp, userId } = req.body;
      
      if (!location || !measurement) {
        return res.status(400).json({ error: 'Location and measurement are required' });
      }
      
      const insertQuery = `
        INSERT INTO citizen_observations (location, measurement, timestamp, user_id) 
        VALUES ($1, $2, $3, $4) 
        RETURNING id
      `;
      
      const result = await db.one(insertQuery, [
        JSON.stringify(location),
        measurement,
        timestamp || new Date(),
        userId || null
      ]);
      
      return res.status(201).json({ success: true, id: result.id });
    } else {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
  } catch (error) {
    console.error('API POST Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default handler;