// scripts/publish-to-geoserver.js
// Script to publish PostGIS datasets to GeoServer for spatial visualization

const GeoServerService = require('../lib/geoserver-service');
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

async function publishDatasetsToGeoServer() {
  const geoserver = new GeoServerService();
  
  try {
    console.log('🚀 Starting dataset publication to GeoServer...');
    
    // Initialize GeoServer (create workspace and datastore)
    await geoserver.initialize();
    
    // Connect to database
    const client = await pool.connect();
    console.log('✅ Connected to database');
    
    // Define the datasets to publish
    const datasets = [
      {
        tableName: 'light_measurements',
        layerName: 'light_pollution_measurements',
        title: 'Citizen Scientist Light Pollution Measurements',
        abstract: 'Light pollution measurements collected by citizen scientists using SQM devices'
      },
      {
        tableName: 'scientific_measurements',
        layerName: 'scientific_light_measurements',
        title: 'Scientific Light Pollution Measurements',
        abstract: 'Validated scientific light pollution measurements from professional equipment'
      },
      {
        tableName: 'satellite_light_data',
        layerName: 'satellite_light_pollution',
        title: 'Satellite Light Pollution Data',
        abstract: 'Nighttime light data from satellite sources (VIIRS, DMSP)'
      },
      {
        tableName: 'light_sources',
        layerName: 'light_sources',
        title: 'Light Sources',
        abstract: 'Individual light sources contributing to light pollution'
      },
      {
        tableName: 'environmental_context',
        layerName: 'environmental_context',
        title: 'Environmental Context',
        abstract: 'Environmental conditions at measurement locations'
      },
      {
        tableName: 'users',
        layerName: 'user_locations',
        title: 'User Locations',
        abstract: 'Locations of registered users in the system'
      }
    ];
    
    // Publish each dataset to GeoServer
    for (const dataset of datasets) {
      try {
        console.log(`\n.Publishing ${dataset.tableName} as layer ${dataset.layerName}...`);
        
        // First, ensure the table exists and has data
        const countResult = await client.query(
          `SELECT COUNT(*) as count FROM ${dataset.tableName}`
        );
        
        const recordCount = parseInt(countResult.rows[0].count);
        console.log(`  Found ${recordCount} records in ${dataset.tableName}`);
        
        if (recordCount > 0) {
          // Publish the layer from the PostGIS table
          await geoserver.publishLayer(
            dataset.tableName,
            dataset.layerName,
            dataset.title,
            dataset.abstract
          );
          
          console.log(`  ✅ Successfully published ${dataset.layerName}`);
        } else {
          console.log(`  ⚠️  No data found in ${dataset.tableName}, skipping...`);
        }
      } catch (layerError) {
        console.error(`  ❌ Error publishing ${dataset.layerName}:`, layerError.message);
      }
    }
    
    // Close database connection
    client.release();
    
    console.log('\n✅ Dataset publication to GeoServer completed!');
    console.log('\n📊 Published layers:');
    console.log('   - light_pollution_measurements: Citizen scientist measurements');
    console.log('   - scientific_light_measurements: Scientific measurements');
    console.log('   - satellite_light_pollution: Satellite-based light data');
    console.log('   - light_sources: Individual light sources');
    console.log('   - environmental_context: Environmental conditions');
    console.log('   - user_locations: User locations');
    
    // Show how to access the layers
    console.log('\n🌐 Access URLs:');
    console.log('   WMS Template for light measurements:', geoserver.getWmsUrl('light_pollution_measurements'));
    console.log('   WFS URL for light measurements:', geoserver.getWfsUrl('light_pollution_measurements'));
    
  } catch (error) {
    console.error('❌ Error during dataset publication:', error.message);
    throw error;
  }
}

// Run the publication function
if (require.main === module) {
  publishDatasetsToGeoServer()
    .then(() => {
      console.log('\n🎉 Publication process completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Publication process failed:', error);
      process.exit(1);
    });
}

module.exports = publishDatasetsToGeoServer;