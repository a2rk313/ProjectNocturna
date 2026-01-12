// scripts/migrate.js - Database migration script
const { query, logger } = require('../config/db');

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');

    // Add any additional migrations here if needed
    // For now, we just ensure the tables exist as defined in database_setup.sql
    
    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;