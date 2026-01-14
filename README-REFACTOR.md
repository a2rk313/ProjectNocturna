# Project Nocturna - Refactored Architecture

This document describes the refactored architecture of Project Nocturna, designed for improved production readiness, scalability, and maintainability.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Key Improvements](#key-improvements)
- [Production Deployment](#production-deployment)
- [Development Setup](#development-setup)
- [Environment Configuration](#environment-configuration)
- [Monitoring & Health Checks](#monitoring--health-checks)

## Architecture Overview

The refactored Project Nocturna follows a modular, scalable architecture with:

- **Modular Server Structure**: Separated concerns with dedicated route handlers
- **Production-Ready Configuration**: Optimized for Vercel and containerized deployments
- **Enhanced Security**: Built-in security headers, rate limiting, and authentication
- **Comprehensive Error Handling**: Graceful degradation and fallback mechanisms
- **Performance Optimizations**: Compression, caching, and efficient resource utilization

### Main Components

1. **Server Core** (`server-refactored.js`): Main application entry point with security and performance features
2. **Route Handlers**: Dedicated modules for different API domains
3. **Configuration Manager**: Centralized environment and configuration management
4. **Utility Functions**: Shared functionality across the application

## Key Improvements

### 1. Modular Code Structure
- Separated routes into dedicated files for better maintainability
- Clean separation of concerns between business logic and infrastructure
- Reusable utility functions

### 2. Enhanced Security
- Helmet.js for HTTP header security
- Rate limiting to prevent abuse
- Input validation and sanitization
- Non-root user execution in containers

### 3. Production Readiness
- Health check endpoints
- Comprehensive error handling
- Graceful shutdown procedures
- Performance optimizations (compression, caching)

### 4. Vercel Optimization
- Optimized vercel.json with security headers
- Efficient build and deployment configuration
- Better static asset handling

### 5. Container Security
- Multi-stage Docker builds
- Non-root user execution
- Minimal attack surface
- Health checks for orchestration

## Production Deployment

### Vercel Deployment

1. Ensure you have a Vercel account and the Vercel CLI installed
2. Configure environment variables in the Vercel dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `NASA_API_KEY`
   - `JWT_SECRET`
   - Any other required variables

3. Deploy using:
```bash
npm run vercel-deploy
```

### Docker Deployment

For production containerized deployment:

```bash
# Build and run with production compose file
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes/Helm Deployment

For advanced orchestration, the application is compatible with standard Kubernetes deployments.

## Development Setup

### Prerequisites

- Node.js v18 or higher
- npm or yarn
- Docker (for optional GeoServer integration)

### Quick Start

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration

4. Run in development mode:
```bash
npm run dev
```

5. Or run the refactored server:
```bash
npm run refactor-start
```

## Environment Configuration

### Required Variables

- `NODE_ENV`: Environment mode (development, production, test)
- `JWT_SECRET`: Secret key for JWT signing (use strong, random value in production)
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key

### Optional Variables

- `NASA_API_KEY`: NASA API key for real data access
- `EARTHDATA_USERNAME`/`EARTHDATA_PASSWORD`: Earthdata credentials
- `GEOSERVER_URL`: GeoServer endpoint for advanced geospatial features
- `MAPBOX_TOKEN`: Mapbox token for enhanced mapping features

## Monitoring & Health Checks

### Health Endpoint

The application exposes a health check endpoint at `/health`:

```bash
curl http://localhost:3000/health
```

Response includes:
- Application status
- Uptime information
- Memory usage
- Environment details

### Logging

The application implements structured logging with timestamp, method, path, and response time information.

### Performance Metrics

Built-in metrics collection for monitoring request volume, response times, and error rates.

## Running in Debian Distrobox

The refactored application is optimized for containerized environments including Debian Distrobox:

1. Install Docker in your Distrobox:
```bash
sudo apt update && sudo apt install docker.io
sudo systemctl start docker && sudo usermod -aG docker $USER
```

2. Run the application:
```bash
# Using Docker Compose
docker-compose up -d

# Or build and run directly
docker build -t project-nocturna .
docker run -p 3000:3000 project-nocturna
```

## API Documentation

### Base Endpoints

- `GET /health`: Health check endpoint
- `GET /api/viirs/:year`: NASA VIIRS data
- `GET /api/viirs/:year/:month`: Monthly VIIRS data
- `GET /api/world-atlas`: World Atlas data
- `GET /api/sqm-network`: SQM Network data
- `GET /api/dark-sky-parks`: Dark Sky Parks
- `GET /api/geoserver/health`: GeoServer integration

### Rate Limiting

All `/api/*` endpoints are protected by rate limiting (100 requests per 15 minutes per IP).

## Security Features

- CORS configured for secure cross-origin requests
- Helmet.js security headers
- Input validation and sanitization
- SQL injection protection
- XSS prevention
- Secure session management

## Troubleshooting

### Common Issues

1. **Environment Variables Not Loading**: Ensure `.env` file is properly configured
2. **Database Connection Issues**: Verify database credentials and network connectivity
3. **GeoServer Integration Failures**: Check GeoServer availability and credentials
4. **API Key Issues**: Confirm NASA API key validity

### Debugging

Enable debug logging by setting `LOG_LEVEL=debug` in your environment.

## Contributing

For development contributions, please follow the established code style and submit pull requests with comprehensive tests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

*Project Nocturna Refactored: Production-ready light pollution monitoring platform*