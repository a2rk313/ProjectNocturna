// api/index.js - Main API handler for Vercel
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import apiRoutes from '../routes/index.js';
import authRoutes from '../routes/auth.js';
import measurementRoutes from '../routes/measurements.js';

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Needed for map libraries
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Compression middleware
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime ? process.uptime() : 0,
    memoryUsage: process.memoryUsage ? process.memoryUsage() : {},
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/measurements', measurementRoutes);
app.use('/api', apiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production') {
    // Don't expose stack trace in production
    res.status(err.status || 500).json({
      error: {
        message: err.message || 'Internal Server Error',
        ...(err.status === 404 && { type: 'NOT_FOUND' }),
        ...(err.status >= 500 && { type: 'INTERNAL_ERROR' })
      }
    });
  } else {
    // In development, include stack trace
    res.status(err.status || 500).json({
      error: {
        message: err.message,
        stack: err.stack,
        type: 'ERROR_DETAILS'
      }
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Create a server to handle the Vercel request
const server = createServer(app);

export default function handler(req, res) {
  server.emit('request', req, res);
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};