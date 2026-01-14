// config/app.js - Application configuration
const Joi = require('joi');

// Validation schema for environment variables
const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_NAME: Joi.string().default('project_nocturna'),
  DB_USER: Joi.string().default('postgres'),
  DB_PASSWORD: Joi.string().default('password'),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  NASA_API_KEY: Joi.string().allow(''),
  EARTHDATA_USERNAME: Joi.string().allow(''),
  EARTHDATA_PASSWORD: Joi.string().allow(''),
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_ANON_KEY: Joi.string().required(),
  LOG_LEVEL: Joi.string().default('info'),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: Joi.number().default(100),
  API_VERSION: Joi.string().default('v1'),
  ALLOWED_ORIGINS: Joi.string().default('http://localhost:3000,http://localhost:5000,https://*.vercel.app'),
}).unknown();

const { value: envVars, error } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  db: {
    host: envVars.DB_HOST,
    port: envVars.DB_PORT,
    name: envVars.DB_NAME,
    user: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
  },
  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
  },
  api: {
    nasaApiKey: envVars.NASA_API_KEY,
    earthdataUsername: envVars.EARTHDATA_USERNAME,
    earthdataPassword: envVars.EARTHDATA_PASSWORD,
    version: envVars.API_VERSION,
  },
  supabase: {
    url: envVars.SUPABASE_URL,
    anonKey: envVars.SUPABASE_ANON_KEY,
  },
  logging: {
    level: envVars.LOG_LEVEL,
  },
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    max: envVars.RATE_LIMIT_MAX,
  },
  allowedOrigins: envVars.ALLOWED_ORIGINS.split(','),
};