// server-refactored.js - Modular, production-ready server
let dotenv, express, cors, path, helmet, compression, rateLimit, createProxyMiddleware;

try {
  dotenv = require('dotenv');
  dotenv.config();
} catch (error) {
  console.warn('dotenv not found, continuing without environment variables');
}

try {
  express = require('express');
  cors = require('cors');
  path = require('path');
  helmet = require('helmet');
  compression = require('compression');
  rateLimit = require('express-rate-limit');
  ({ createProxyMiddleware } = require('http-proxy-middleware'));
} catch (error) {
  console.error('Missing required dependencies. Please run: npm install');
  console.error('Error:', error.message);
  process.exit(1);
}

// Import configurations
const config = require('./config/app');

// Import routes
const apiRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const measurementRoutes = require('./routes/measurements');
const analysisRoutes = require('./routes/analysis');

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Needed for map libraries
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // Allow inline scripts
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],  // Allow inline styles and external CSS
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      fontSrc: ["'self'", "https:"],
      connectSrc: ["'self'", "https:"],
      frameSrc: ["'self'", "https:"],
      objectSrc: ["'none'"]
    }
  }
}));

// Compression middleware
app.use(compression());

// CORS configuration
app.use(cors({
  origin: config.allowedOrigins,
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Proxy middleware for GeoServer (Fixed for v3.x)
const geoServerProxy = process.env.GEOSERVER_URL 
  ? createProxyMiddleware({
      target: process.env.GEOSERVER_URL || 'http://localhost:8080/geoserver',
      changeOrigin: true,
      pathRewrite: {
        '^/api/geoserver': '', // Remove /api/geoserver prefix when forwarding
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log(`Proxying request: ${req.method} ${req.url} -> GeoServer`);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log(`Response from GeoServer: ${proxyRes.statusCode}`);
      },
      onError: (err, req, res) => {
        console.error('GeoServer proxy error:', err);
        res.status(500).json({
          error: 'GeoServer connection failed',
          message: 'Unable to connect to the GeoServer'
        });
      }
    })
  : createProxyMiddleware({
      target: 'http://localhost:8080/geoserver',
      changeOrigin: true,
      pathRewrite: {
        '^/api/geoserver': '', // Remove /api/geoserver prefix when forwarding
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log(`Proxying request: ${req.method} ${req.url} -> GeoServer`);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log(`Response from GeoServer: ${proxyRes.statusCode}`);
      },
      onError: (err, req, res) => {
        console.error('GeoServer proxy error:', err);
        res.status(500).json({
          error: 'GeoServer connection failed',
          message: 'Unable to connect to the GeoServer'
        });
      }
    });

app.use('/api/geoserver', geoServerProxy);

// Logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    nodeEnv: config.env
  });
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true,
  // Explicitly set content-type for CSS files to avoid MIME type issues
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/measurements', measurementRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api', apiRoutes);

// Serve HTML files for non-API routes (SPA support)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

// Catch-all for other frontend routes to support client-side routing
app.get(/^(?!\/api\/).*$/, (req, res) => {
  // Check if it's a known HTML page
  if (req.path === '/index.html' || req.path === '/app.html') {
    res.sendFile(path.join(__dirname, 'public', req.path.replace('/', '')));
  } else {
    // For other frontend routes, serve index.html (for SPA routing)
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (config.env === 'production') {
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

// Export the app for Vercel
module.exports = app;

// Start server only if run directly (not imported)
if (require.main === module) {
  // Only start server if this file is run directly (not imported)
  const PORT = config.port || process.env.PORT || 3000;
  
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running in ${config.env} mode on port ${PORT}`);
    console.log(`📊 Health check available at http://localhost:${PORT}/health`);
    console.log(`🌍 API base URL: http://localhost:${PORT}/api`);
  });

  // Handle graceful shutdown
  process.on('SIGTERM', function() {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(function() {
      console.log('Process terminated');
    });
  });

  process.on('SIGINT', function() {
    console.log('SIGINT received, shutting down gracefully');
    server.close(function() {
      console.log('Process terminated');
    });
  });
}