// scripts/seed.js - Database seeding script
const { query, logger } = require('../config/db');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');

    // Insert default subscription plans
    const plans = [
      {
        name: 'Free',
        description: 'Basic access to Project Nocturna',
        price: 0,
        monthly_api_calls: 1000,
        data_download_limit_mb: 100,
        features: ['basic_data_access', 'community_support']
      },
      {
        name: 'Researcher',
        description: 'Access for individual researchers',
        price: 29.99,
        monthly_api_calls: 10000,
        data_download_limit_mb: 1000,
        features: ['full_data_access', 'advanced_analytics', 'api_priority', 'research_tools', 'email_support']
      },
      {
        name: 'Professional',
        description: 'Access for professionals and organizations',
        price: 99.99,
        monthly_api_calls: 100000,
        data_download_limit_mb: 10000,
        features: ['full_data_access', 'advanced_analytics', 'api_priority', 'research_tools', 'private_sharing', 'dedicated_support', 'white_label_options']
      }
    ];

    for (const plan of plans) {
      const existingPlan = await query(
        'SELECT id FROM subscription_plans WHERE name = $1',
        [plan.name]
      );

      if (existingPlan.rowCount === 0) {
        await query(
          'INSERT INTO subscription_plans (name, description, price, monthly_api_calls, data_download_limit_mb, features) VALUES ($1, $2, $3, $4, $5, $6)',
          [plan.name, plan.description, plan.price, plan.monthly_api_calls, plan.data_download_limit_mb, JSON.stringify(plan.features)]
        );
        logger.info(`Added subscription plan: ${plan.name}`);
      } else {
        logger.info(`Subscription plan already exists: ${plan.name}`);
      }
    }

    // Create admin user if not exists
    const adminEmail = 'admin@projectnocturna.com';
    const adminUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

    if (adminUser.rowCount === 0) {
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash('admin123', saltRounds);
      
      await query(
        'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5)',
        [adminEmail, passwordHash, 'Admin', 'User', 'admin']
      );
      logger.info('Created admin user');
    } else {
      logger.info('Admin user already exists');
    }

    logger.info('Database seeding completed successfully');
  } catch (error) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;