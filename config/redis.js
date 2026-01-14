// config/redis.js - Redis configuration
const { createClient } = require('redis');
const winston = require('winston');

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  username: process.env.REDIS_USERNAME || undefined,
  socket: {
    connectTimeout: 5000,
    reconnectStrategy: (retries) => {
      if (retries >= 5) {
        return new Error('Redis: Too many retries');
      }
      return Math.min(retries * 100, 3000);
    }
  }
};

const redisClient = createClient(redisConfig);

redisClient.on('error', (err) => {
  winston.error('Redis Client Error', err);
});

redisClient.on('connect', () => {
  winston.info('Connected to Redis');
});

module.exports = redisClient;