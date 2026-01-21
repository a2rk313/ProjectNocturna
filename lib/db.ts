import { getPostGISPool } from './database';

/**
 * Retrieves dark sky parks from the database
 */
export async function getDarkSkyParks(limit: number = 20, offset: number = 0) {
  const pool = getPostGISPool();

  try {
    const query = `
      SELECT
        id,
        external_id,
        name,
        designation,
        country,
        sqm,
        bortle,
        area_km2,
        established,
        url,
        ST_Y(location::geometry) as lat,
        ST_X(location::geometry) as lon
      FROM public.dark_sky_parks_enhanced
      ORDER BY name
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  } catch (error: any) {
    if (error.code === '42P01') {
      console.warn('Table dark_sky_parks_enhanced does not exist, returning empty list.');
      return [];
    }
    console.error('Error retrieving dark sky parks:', error);
    return [];
  }
}

/**
 * Retrieves dark sky parks near a specific location
 */
export async function getDarkSkyParksNearLocation(lat: number, lon: number, radiusKm: number = 500, limit: number = 20, offset: number = 0) {
  const pool = getPostGISPool();

  try {
    const query = `
      SELECT
        id,
        external_id,
        name,
        designation,
        country,
        sqm,
        bortle,
        area_km2,
        established,
        url,
        ST_Y(location::geometry) as lat,
        ST_X(location::geometry) as lon,
        ST_Distance(location::geography, ST_SetSRID(ST_Point($1, $2), 4326)::geography) / 1000 as distance_km
      FROM public.dark_sky_parks_enhanced
      WHERE ST_DWithin(
        location::geography,
        ST_SetSRID(ST_Point($1, $2), 4326)::geography,
        $3 * 1000  -- Convert km to meters
      )
      ORDER BY ST_Distance(location::geography, ST_SetSRID(ST_Point($1, $2), 4326)::geography)
      LIMIT $4 OFFSET $5
    `;

    const result = await pool.query(query, [lon, lat, radiusKm, limit, offset]);
    return result.rows;
  } catch (error: any) {
    if (error.code === '42P01') {
      console.warn('Table dark_sky_parks_enhanced does not exist, returning empty list.');
      return [];
    }
    console.error('Error retrieving dark sky parks near location:', error);
    return [];
  }
}

/**
 * Finds dark sky sites nearby using VIIRS and SQM data
 */
export async function findDarkSkySitesNearby(lat: number, lon: number, radiusKm: number = 50) {
  const pool = getPostGISPool();

  try {
    // Query for nearby dark sky sites combining parks and low light pollution measurements
    const query = `
      WITH nearby_parks AS (
        SELECT
          id,
          name,
          'park' as type,
          bortle,
          sqm,
          ST_Y(location::geometry) as lat,
          ST_X(location::geometry) as lon,
          ST_Distance(location::geography, ST_SetSRID(ST_Point($1, $2), 4326)::geography) / 1000 as distance_km
        FROM public.dark_sky_parks_enhanced
        WHERE ST_DWithin(
          location::geography,
          ST_SetSRID(ST_Point($1, $2), 4326)::geography,
          $3 * 1000
        )
      ),
      nearby_measurements AS (
        SELECT
          id,
          'Station ' || id as name,
          'measurement' as type,
          CASE
            WHEN mpsas > 20 THEN 1
            WHEN mpsas > 19 THEN 2
            WHEN mpsas > 18 THEN 3
            WHEN mpsas > 17 THEN 4
            WHEN mpsas > 16 THEN 5
            WHEN mpsas > 15 THEN 6
            ELSE 7
          END as bortle,
          mpsas as sqm,
          ST_Y(location::geometry) as lat,
          ST_X(location::geometry) as lon,
          ST_Distance(location::geography, ST_SetSRID(ST_Point($1, $2), 4326)::geography) / 1000 as distance_km
        FROM public.sqm_readings_enhanced
        WHERE ST_DWithin(
          location::geography,
          ST_SetSRID(ST_Point($1, $2), 4326)::geography,
          $3 * 1000
        )
        AND quality_score > 70  -- Only include high-quality measurements
      )
      SELECT * FROM nearby_parks
      UNION ALL
      SELECT * FROM nearby_measurements
      ORDER BY distance_km
      LIMIT 50
    `;

    const result = await pool.query(query, [lon, lat, radiusKm]);
    return result.rows;
  } catch (error: any) {
    if (error.code === '42P01') {
      console.warn('Table dark_sky_parks_enhanced or sqm_readings_enhanced does not exist, returning empty list.');
      return [];
    }
    console.error('Error finding dark sky sites nearby:', error);
    return [];
  }
}

// Export the pool getter function for other modules to use
export { getPostGISPool };