const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER || 'nocturna_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'nocturna_db',
  password: process.env.DB_PASSWORD || 'nocturna_pass',
  port: parseInt(process.env.DB_PORT) || 5432,
});

// Function to apply database schema
async function applySchema() {
  const schemaPath = path.join(__dirname, 'light_pollution_schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  console.log('Applying database schema...');
  try {
    await pool.query(schema);
    console.log('Database schema applied successfully!');
  } catch (err) {
    console.error('Error applying schema:', err);
    throw err;
  }
}

// Function to initialize database (apply schema and ensure tables exist)
async function initializeDatabase() {
  // Apply the schema first
  await applySchema();
}

// Function to fetch and insert real light pollution data
async function populateDatabase() {
  try {
    console.log('Connecting to database...');
    
    // Initialize database tables
    await initializeDatabase();
    console.log('Database initialized successfully!');

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
      const insertUserSQL = `
        INSERT INTO users (username, email, password_hash, role, expertise_level)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (username) DO NOTHING
      `;
      
      await pool.query(insertUserSQL, [
        userData.username,
        userData.email,
        '$2b$10$example_hash_for_demo', // bcrypt hash example
        userData.role,
        userData.expertise_level
      ]);
      console.log(`Inserted user: ${userData.username}`);
    }

    // Example: Insert sample light pollution measurements
    const measurements = [
      {
        latitude: 40.7128, // New York City
        longitude: -74.0060,
        sky_brightness: 17.5,
        timestamp: new Date(Date.now() - 86400000).toISOString() // Yesterday
      },
      {
        latitude: 34.0522, // Los Angeles
        longitude: -118.2437,
        sky_brightness: 16.8,
        timestamp: new Date(Date.now() - 86400000).toISOString()
      },
      {
        latitude: 41.9028, // Chicago
        longitude: -87.6298,
        sky_brightness: 17.2,
        timestamp: new Date(Date.now() - 86400000).toISOString()
      },
      {
        latitude: 39.9526, // Philadelphia
        longitude: -75.1652,
        sky_brightness: 17.0,
        timestamp: new Date(Date.now() - 86400000).toISOString()
      },
      {
        latitude: 29.7604, // Houston
        longitude: -95.3698,
        sky_brightness: 16.5,
        timestamp: new Date(Date.now() - 86400000).toISOString()
      }
    ];

    // Get a random user ID for the measurements
    const userResult = await pool.query('SELECT uuid FROM users ORDER BY RANDOM() LIMIT 1');
    const userId = userResult.rows.length > 0 ? userResult.rows[0].uuid : null;

    for (const measurement of measurements) {
      const insertMeasurementSQL = `
        INSERT INTO light_measurements (latitude, longitude, sky_brightness_mag_arcsec2, 
          measurement_datetime, measurement_quality_score, submitted_by_user_id)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      await pool.query(insertMeasurementSQL, [
        measurement.latitude,
        measurement.longitude,
        measurement.sky_brightness,
        measurement.timestamp,
        0.85, // Good quality score
        userId
      ]);
      console.log(`Inserted measurement for (${measurement.latitude}, ${measurement.longitude})`);
    }

    // Insert satellite data (simulated with realistic values)
    const satelliteData = [
      {
        latitude: 40.7128,
        longitude: -74.0060,
        radiance: 12.45,
        date: new Date(Date.now() - 86400000 * 7).toISOString() // A week ago
      },
      {
        latitude: 34.0522,
        longitude: -118.2437,
        radiance: 15.21,
        date: new Date(Date.now() - 86400000 * 7).toISOString()
      },
      {
        latitude: 41.9028,
        longitude: -87.6298,
        radiance: 11.89,
        date: new Date(Date.now() - 86400000 * 7).toISOString()
      }
    ];

    for (const satData of satelliteData) {
      const insertSatelliteSQL = `
        INSERT INTO satellite_light_data (latitude, longitude, radiance_value, acquisition_date, 
          satellite_source, data_quality_flag)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      await pool.query(insertSatelliteSQL, [
        satData.latitude,
        satData.longitude,
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
      const insertEnvSQL = `
        INSERT INTO environmental_context (latitude, longitude, temperature_celsius, 
          humidity_percentage, atmospheric_pressure_hpa, 
          urban_rural_classification, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await pool.query(insertEnvSQL, [
        env.latitude,
        env.longitude,
        env.temp,
        env.humidity,
        env.pressure,
        env.classification,
        new Date().toISOString()
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

    // Get a random user ID for the light sources
    const userResult2 = await pool.query('SELECT uuid FROM users ORDER BY RANDOM() LIMIT 1');
    const userId2 = userResult2.rows.length > 0 ? userResult2.rows[0].uuid : null;

    for (const source of lightSources) {
      const insertSourceSQL = `
        INSERT INTO light_sources (latitude, longitude, source_type, 
          intensity_lumens, color_temperature_kelvin, contributed_by_user_id)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      await pool.query(insertSourceSQL, [
        source.latitude,
        source.longitude,
        source.type,
        source.lumens,
        source.kelvin,
        userId2
      ]);
      console.log(`Inserted light source for (${source.latitude}, ${source.longitude})`);
    }

    console.log('Database populated successfully!');
  } catch (err) {
    console.error('Error populating database:', err);
    throw err;
  }
}

// Run the population function
populateDatabase()
  .then(() => {
    console.log('Database population completed.');
    // Close the database connection
    pool.end(() => {
      console.log('Database connection closed.');
      process.exit(0);
    });
  })
  .catch((err) => {
    console.error('Database population failed:', err);
    // Close the database connection even if there's an error
    pool.end(() => {
      console.log('Database connection closed.');
      process.exit(1);
    });
  });