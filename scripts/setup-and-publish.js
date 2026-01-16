#!/usr/bin/env node
// scripts/setup-and-publish.js
// Master script to set up the database and publish datasets to GeoServer

const { execSync } = require('child_process');
const path = require('path');

async function setupAndPublish() {
  console.log('🚀 Starting Project Nocturna setup and publication process...');
  
  try {
    // Step 1: Create the database schema
    console.log('\n📋 Creating database schema...');
    const schemaPath = path.join(__dirname, '../light_pollution_schema.sql');
    const dbUrl = process.env.DATABASE_URL || 
                  `postgresql://${process.env.DB_USER || 'postgres'}:` +
                  `${process.env.DB_PASSWORD || 'postgres'}@` +
                  `${process.env.DB_HOST || 'localhost'}:` +
                  `${process.env.DB_PORT || 5432}/` +
                  `${process.env.DB_NAME || 'light_pollution_db'}`;
    
    // Execute the schema using psql
    try {
      execSync(`psql "${dbUrl}" -f "${schemaPath}"`, { stdio: 'inherit' });
      console.log('✅ Database schema created successfully');
    } catch (schemaError) {
      console.log('⚠️  Schema creation failed or already exists, continuing...');
    }
    
    // Step 2: Populate the database with sample data
    console.log('\n📦 Populating database with sample data...');
    execSync('node populate_database.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log('✅ Database populated successfully');
    
    // Step 3: Publish datasets to GeoServer
    console.log('\n📡 Publishing datasets to GeoServer...');
    execSync('node scripts/publish-to-geoserver.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log('✅ Datasets published to GeoServer successfully');
    
    console.log('\n🎉 Complete! Project Nocturna is now set up with:');
    console.log('   - Database schema created');
    console.log('   - Sample data populated');
    console.log('   - Datasets published to GeoServer');
    console.log('\n📊 Available GeoServer layers:');
    console.log('   - light_pollution_measurements');
    console.log('   - scientific_light_measurements');
    console.log('   - satellite_light_pollution');
    console.log('   - light_sources');
    console.log('   - environmental_context');
    console.log('   - user_locations');
    
  } catch (error) {
    console.error('❌ Setup and publication failed:', error.message);
    process.exit(1);
  }
}

// Run the setup function
if (require.main === module) {
  setupAndPublish();
}

module.exports = setupAndPublish;