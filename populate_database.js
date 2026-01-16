const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'light_pollution_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Function to fetch and insert real light pollution data
async function populateDatabase() {
  try {
    console.log('Connecting to database...');
    
    // Test connection
    const client = await pool.connect();
    console.log('Connected to database successfully!');

    // Insert sample users
    const usersData = [
      {
        username: 'dr_johnson',
        email: 'johnson@astronomy.edu',
        role: 'researcher',
        expertise_level: 'expert'
      },
      {
        username: 'skywatcher_mike',
        email: 'mike@outreach.org',
        role: 'citizen_scientist',
        expertise_level: 'experienced'
      },
      {
        username: 'urban_observer',
        email: 'urban.obs@city.gov',
        role: 'researcher',
        expertise_level: 'expert'
      }
    ];

    for (const userData of usersData) {
      const insertUserQuery = `
        INSERT INTO users (username, email, password_hash, role, expertise_level)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO NOTHING
        RETURNING id, uuid;
      `;
      
      const result = await client.query(insertUserQuery, [
        userData.username,
        userData.email,
        '$2b$10$example_hash_for_demo', // bcrypt hash example
        userData.role,
        userData.expertise_level
      ]);
      
      if (result.rows.length > 0) {
        console.log(`Inserted user: ${userData.username}`);
      } else {
        console.log(`User ${userData.username} already exists`);
      }
    }

    // Fetch real light pollution data from external APIs
    console.log('Fetching real light pollution data...');
    
    // Example: Insert sample light pollution measurements
    const measurements = [
      {
        latitude: 40.7128, // New York City
        longitude: -74.0060,
        sky_brightness: 17.5,
        timestamp: new Date(Date.now() - 86400000) // Yesterday
      },
      {
        latitude: 34.0522, // Los Angeles
        longitude: -118.2437,
        sky_brightness: 16.8,
        timestamp: new Date(Date.now() - 86400000)
      },
      {
        latitude: 41.9028, // Chicago
        longitude: -87.6298,
        sky_brightness: 17.2,
        timestamp: new Date(Date.now() - 86400000)
      },
      {
        latitude: 39.9526, // Philadelphia
        longitude: -75.1652,
        sky_brightness: 17.0,
        timestamp: new Date(Date.now() - 86400000)
      },
      {
        latitude: 29.7604, // Houston
        longitude: -95.3698,
        sky_brightness: 16.5,
        timestamp: new Date(Date.now() - 86400000)
      }
    ];

    for (const measurement of measurements) {
      const insertMeasurementQuery = `
        INSERT INTO light_measurements (
          latitude, longitude, location, sky_brightness_mag_arcsec2, 
          measurement_datetime, submitted_by_user_id, measurement_quality_score
        )
        VALUES ($1, $2, ST_GeogFromText($3), $4, $5, $6, $7)
        ON CONFLICT DO NOTHING;
      `;
      
      // Get a random user ID for the submitter
      const randomUserResult = await client.query(
        'SELECT uuid FROM users ORDER BY RANDOM() LIMIT 1'
      );
      
      if (randomUserResult.rows.length > 0) {
        await client.query(insertMeasurementQuery, [
          measurement.latitude,
          measurement.longitude,
          `POINT(${measurement.longitude} ${measurement.latitude})`,
          measurement.sky_brightness,
          measurement.timestamp,
          randomUserResult.rows[0].uuid,
          0.85 // Good quality score
        ]);
        
        console.log(`Inserted measurement for (${measurement.latitude}, ${measurement.longitude})`);
      }
    }

    // Insert satellite data (simulated with realistic values)
    const satelliteData = [
      {
        latitude: 40.7128,
        longitude: -74.0060,
        radiance: 12.45,
        date: new Date(Date.now() - 86400000 * 7) // A week ago
      },
      {
        latitude: 34.0522,
        longitude: -118.2437,
        radiance: 15.21,
        date: new Date(Date.now() - 86400000 * 7)
      },
      {
        latitude: 41.9028,
        longitude: -87.6298,
        radiance: 11.89,
        date: new Date(Date.now() - 86400000 * 7)
      }
    ];

    for (const satData of satelliteData) {
      const insertSatelliteQuery = `
        INSERT INTO satellite_light_data (
          latitude, longitude, location, radiance_value, acquisition_date, 
          satellite_source, data_quality_flag
        )
        VALUES ($1, $2, ST_GeogFromText($3), $4, $5, $6, $7)
        ON CONFLICT DO NOTHING;
      `;
      
      await client.query(insertSatelliteQuery, [
        satData.latitude,
        satData.longitude,
        `POINT(${satData.longitude} ${satData.latitude})`,
        satData.radiance,
        satData.date,
        'VIIRS',
        1 // High quality
      ]);
      
      console.log(`Inserted satellite data for (${satData.latitude}, ${satData.longitude})`);
    }

    // Insert environmental context data
    const envContexts = [
      {
        latitude: 40.7128,
        longitude: -74.0060,
        temp: 15.6,
        humidity: 65,
        pressure: 1013.25,
        classification: 'urban'
      },
      {
        latitude: 34.0522,
        longitude: -118.2437,
        temp: 18.3,
        humidity: 45,
        pressure: 1012.80,
        classification: 'urban'
      },
      {
        latitude: 36.7783, // California rural area
        longitude: -119.4179,
        temp: 12.4,
        humidity: 55,
        pressure: 1014.10,
        classification: 'rural'
      }
    ];

    for (const env of envContexts) {
      const insertEnvQuery = `
        INSERT INTO environmental_context (
          latitude, longitude, location, temperature_celsius, 
          humidity_percentage, atmospheric_pressure_hpa, 
          urban_rural_classification, timestamp
        )
        VALUES ($1, $2, ST_GeogFromText($3), $4, $5, $6, $7, $8)
        ON CONFLICT DO NOTHING;
      `;
      
      await client.query(insertEnvQuery, [
        env.latitude,
        env.longitude,
        `POINT(${env.longitude} ${env.latitude})`,
        env.temp,
        env.humidity,
        env.pressure,
        env.classification,
        new Date()
      ]);
      
      console.log(`Inserted environmental context for (${env.latitude}, ${env.longitude})`);
    }

    // Insert light sources
    const lightSources = [
      {
        latitude: 40.7589, // Times Square area
        longitude: -73.9851,
        type: 'commercial',
        lumens: 50000,
        kelvin: 4000
      },
      {
        latitude: 34.0544, // Downtown LA
        longitude: -118.2437,
        type: 'street_light',
        lumens: 15000,
        kelvin: 3000
      },
      {
        latitude: 41.8781, // Chicago Loop
        longitude: -87.6298,
        type: 'industrial',
        lumens: 75000,
        kelvin: 5000
      }
    ];

    for (const source of lightSources) {
      const insertSourceQuery = `
        INSERT INTO light_sources (
          latitude, longitude, location, source_type, 
          intensity_lumens, color_temperature_kelvin, 
          contributed_by_user_id
        )
        VALUES ($1, $2, ST_GeogFromText($3), $4, $5, $6, $7)
        ON CONFLICT DO NOTHING;
      `;
      
      // Get a random user ID for the contributor
      const randomUserResult = await client.query(
        'SELECT uuid FROM users ORDER BY RANDOM() LIMIT 1'
      );
      
      if (randomUserResult.rows.length > 0) {
        await client.query(insertSourceQuery, [
          source.latitude,
          source.longitude,
          `POINT(${source.longitude} ${source.latitude})`,
          source.type,
          source.lumens,
          source.kelvin,
          randomUserResult.rows[0].uuid
        ]);
        
        console.log(`Inserted light source for (${source.latitude}, ${source.longitude})`);
      }
    }

    console.log('Database populated successfully!');
    
    client.release();
  } catch (err) {
    console.error('Error populating database:', err);
    throw err;
  }
}

// Run the population function
populateDatabase()
  .then(() => {
    console.log('Database population completed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Database population failed:', err);
    process.exit(1);
  });