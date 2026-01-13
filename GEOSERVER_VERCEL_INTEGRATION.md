# Integrating GeoServer with Project Nocturna for Vercel Deployment

## Overview

This document explains how to properly integrate GeoServer with your Project Nocturna application for Vercel deployment while meeting your requirement for GeoServer functionality.

## The Challenge

Vercel is a serverless platform optimized for static sites and serverless functions, while GeoServer is a Java-based application server that requires a persistent runtime environment. Traditional GeoServer deployments don't work well on Vercel due to architectural differences.

## Solution Options

### Option 1: Self-Hosted GeoServer with Vercel API Gateway (Recommended)

This approach keeps GeoServer separate but integrates it seamlessly with your Vercel deployment:

#### Step 1: Set Up External GeoServer Instance

You'll need to host GeoServer separately (e.g., AWS EC2, DigitalOcean, or similar):

```yaml
# Example docker-compose.yml for external GeoServer hosting
version: '3.8'
services:
  geoserver:
    image: kartoza/geoserver:2.24.1
    container_name: projectnocturna-geoserver
    ports:
      - "8080:8080"
    environment:
      - GEOSERVER_ADMIN_USER=${GEOSERVER_ADMIN_USER:-admin}
      - GEOSERVER_ADMIN_PASSWORD=${GEOSERVER_ADMIN_PASSWORD:-your_secure_password}
    volumes:
      - ./geoserver_data:/opt/geoserver/data_dir
    restart: unless-stopped
```

#### Step 2: Update Environment Variables for Production

Add these to your Vercel project environment variables:

```
GEOSERVER_URL=https://your-geoserver-domain.com/geoserver
GEOSERVER_ADMIN_USER=your_admin_user
GEOSERVER_ADMIN_PASSWORD=your_secure_password
GEOSERVER_WORKSPACE=nocturna
GEOSERVER_DATASTORE=nocturna_datastore
POSTGRES_HOST=your-postgres-host.com
POSTGRES_PORT=5432
POSTGRES_DB=nocturna
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_db_password
```

#### Step 3: Enhanced Error Handling in Production

The existing code already handles this gracefully. If GeoServer is unreachable, the system falls back to alternative data sources.

### Option 2: Cloud-Native Alternative (For Full Vercel Compatibility)

If you need a solution that runs entirely on Vercel, consider using cloud-native alternatives:

#### Alternative: GeoServer-like functionality with Turf.js and MapLibre

Create a JavaScript-based solution that provides similar functionality:

```javascript
// lib/spatial-service.js - GeoServer alternative for Vercel
class SpatialService {
  constructor() {
    // Use browser-based spatial operations with Turf.js
    this.turf = require('@turf/turf');
  }

  // Simulate GeoServer WFS functionality
  async queryFeatures(layerName, bounds, filters = {}) {
    // Fetch data from your existing APIs
    const data = await this.fetchData(layerName);
    
    // Apply spatial filtering using Turf.js
    if (bounds) {
      const bboxPolygon = this.turf.bboxPolygon(bounds);
      const filtered = data.features.filter(feature => 
        this.turf.booleanIntersects(feature, bboxPolygon)
      );
      
      return filtered;
    }
    
    return data.features;
  }

  // Generate WMS-like URLs for static tile services
  getWmsTemplate(layerName) {
    // Return template for vector tile services
    return `https://tiles.locationtech.org/osm/{z}/{x}/{y}.mvt`;
  }

  // Other spatial operations...
}
```

### Option 3: Hybrid Approach (Recommended for Production)

The best approach combines both methods:

1. **Keep existing GeoServer API endpoints** in your Vercel functions
2. **Route requests to external GeoServer** when available
3. **Fall back to alternative data sources** when GeoServer is unavailable

#### Implementation:

```javascript
// Enhanced lib/geoserver-service.js with fallback logic
class GeoServerService {
  constructor() {
    this.baseUrl = process.env.GEOSERVER_URL || 'http://localhost:8080/geoserver';
    this.username = process.env.GEOSERVER_ADMIN_USER || 'admin';
    this.password = process.env.GEOSERVER_ADMIN_PASSWORD || 'geoserver';
    this.workspace = process.env.GEOSERVER_WORKSPACE || 'nocturna';
    this.datastore = process.env.GEOSERVER_DATASTORE || 'nocturna_datastore';
    
    // Authentication header
    this.auth = {
      username: this.username,
      password: this.password
    };
    
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Health check with fallback to alternative data sources
   */
  async healthCheck() {
    try {
      // Try to connect to external GeoServer
      const response = await axios.get(
        `${this.baseUrl}/rest/about/version`,
        { auth: this.auth, headers: this.headers }
      );
      
      if (response.status === 200) {
        return {
          status: 'healthy',
          service: 'GeoServer',
          connected: true,
          version: response.data.about.version,
          timestamp: new Date().toISOString(),
          backend: 'external'
        };
      }
    } catch (error) {
      console.warn('External GeoServer unavailable, falling back to alternative services');
      
      // Fallback to internal spatial operations
      return {
        status: 'degraded',
        service: 'GeoServer',
        connected: false,
        backend: 'internal_fallback',
        warning: 'Using alternative spatial services',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Query features with fallback
   */
  async queryFeatures(layerName, bounds, cqlFilter = null) {
    try {
      // Try external GeoServer first
      const response = await axios.get(`${this.baseUrl}/wfs`, {
        params: {
          service: 'WFS',
          version: '1.0.0',
          request: 'GetFeature',
          typeName: `${this.workspace}:${layerName}`,
          outputFormat: 'application/json',
          maxFeatures: 1000,
          ...(bounds && {
            bbox: `${bounds[0]},${bounds[1]},${bounds[2]},${bounds[3]},EPSG:4326`
          }),
          ...(cqlFilter && { cql_filter: cqlFilter })
        },
        auth: this.auth,
        headers: this.headers
      });

      return response.data;
    } catch (error) {
      console.warn('External GeoServer query failed, using fallback:', error.message);
      
      // Fallback: Use alternative data source
      return await this.fallbackQueryFeatures(layerName, bounds, cqlFilter);
    }
  }

  /**
   * Fallback spatial query method
   */
  async fallbackQueryFeatures(layerName, bounds, cqlFilter) {
    // Implement alternative spatial query using your existing data sources
    // This could pull from Supabase, CSV files, or other data sources
    try {
      // Example: Query your existing light pollution data
      const response = await fetch(`/api/light-pollution-data?bbox=${bounds.join(',')}`);
      const data = await response.json();
      
      // Apply basic spatial filtering in JavaScript
      if (bounds) {
        const [minX, minY, maxX, maxY] = bounds;
        return data.filter(feature => {
          const lat = feature.geometry.coordinates[1];
          const lng = feature.geometry.coordinates[0];
          return lat >= minY && lat <= maxY && lng >= minX && lng <= maxX;
        });
      }
      
      return data;
    } catch (fallbackError) {
      console.error('Fallback query also failed:', fallbackError.message);
      throw fallbackError;
    }
  }
}
```

## Updated Vercel Configuration

Update your `vercel.json` to handle GeoServer API routes properly:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node",
      "config": {
        "includeFiles": ["**/**"],
        "excludeFiles": ["node_modules/**", ".git/**", "*.md", "Dockerfile", "compose.yaml", "docker-compose.*", "podman-compose.yaml", "test_*", "*_backup"]
      }
    },
    {
      "src": "index.html",
      "use": "@vercel/static"
    },
    {
      "src": "app.html",
      "use": "@vercel/static"
    },
    {
      "src": "css/**",
      "use": "@vercel/static"
    },
    {
      "src": "js/**",
      "use": "@vercel/static"
    },
    {
      "src": "images/**",
      "use": "@vercel/static"
    },
    {
      "src": "pages/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/geoserver/(.*)",
      "dest": "/server.js",
      "methods": ["GET", "POST", "PUT", "DELETE"]
    },
    {
      "src": "/api/(.*)",
      "dest": "/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "NODE_ENV": "production",
    "GEOSERVER_URL": "https://your-geoserver-domain.com/geoserver",
    "GEOSERVER_ADMIN_USER": "admin",
    "GEOSERVER_ADMIN_PASSWORD": "secure_password"
  }
}
```

## Deployment Instructions

### For Option 1 (Self-Hosted GeoServer):

1. **Deploy GeoServer externally** (AWS, DigitalOcean, etc.)
2. **Configure security groups/firewall** to allow connections from your Vercel deployment
3. **Update Vercel environment variables** with your external GeoServer URL
4. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

### For Option 3 (Hybrid with Fallback):

1. **Implement the fallback logic** in your GeoServer service
2. **Test locally** to ensure both external and fallback paths work
3. **Deploy to Vercel** with external GeoServer URL as environment variable
4. **Monitor logs** to ensure graceful degradation when external services are unavailable

## Testing Your Integration

Create a test endpoint to verify the integration:

```javascript
// Add to your server.js
app.get('/api/geoserver/status', async (req, res) => {
  try {
    const geoServerService = new (require('./lib/geoserver-service'))();
    const health = await geoServerService.healthCheck();
    
    res.json({
      ...health,
      message: 'GeoServer integration status',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Could not check GeoServer status',
      error: error.message
    });
  }
});
```

## Verification Steps

1. **Deploy your application** to Vercel
2. **Check the GeoServer status endpoint**: `https://your-app.vercel.app/api/geoserver/status`
3. **Test the health check**: `https://your-app.vercel.app/api/geoserver/health`
4. **Verify fallback functionality** by temporarily disabling external GeoServer
5. **Test all GeoServer endpoints** to ensure they work correctly

## Benefits of This Approach

- ✅ **Meets your GeoServer requirement** - The API endpoints remain functional
- ✅ **Works on Vercel** - Serverless functions handle the API calls
- ✅ **Graceful degradation** - Falls back to alternative data sources when needed
- ✅ **Production-ready** - Includes proper error handling and monitoring
- ✅ **Scalable** - Separates compute-intensive GeoServer operations

This solution allows you to maintain the GeoServer functionality required for your project while still deploying successfully to Vercel. The hybrid approach ensures that your application remains functional even if the external GeoServer service is temporarily unavailable.