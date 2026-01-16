// scripts/migrate.js - Database migration script
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'project_nocturna',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT) || 5432,
});

async function runMigrations() {
  let client;
  try {
    console.log('Starting database migrations...');
    client = await pool.connect();
    
    // Read the schema SQL file
    const schemaPath = path.join(__dirname, '../light_pollution_schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executing schema...');
    await client.query(schemaSQL);
    console.log('Schema executed successfully!');
    
    // Create subscription_plans table if it doesn't exist (needed for seed script)
    const createSubscriptionPlansSQL = `
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        price DECIMAL(10, 2),
        monthly_api_calls INTEGER,
        data_download_limit_mb INTEGER,
        features JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Function to update the updated_at timestamp
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';
      
      -- Trigger for subscription_plans
      CREATE TRIGGER update_subscription_plans_updated_at 
      BEFORE UPDATE ON subscription_plans 
      FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    `;
    
    await client.query(createSubscriptionPlansSQL);
    console.log('Additional tables created successfully!');
    
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migration process completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration process failed:', error);
      process.exit(1);
    });
}

module.exports = runMigrations;