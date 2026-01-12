# GeoServer Integration for Project Nocturna

## Overview
This document describes the integration of GeoServer with Project Nocturna for advanced geospatial data management and visualization of light pollution data.

## Features
- **WMS/WFS Support**: Serve geospatial data through standard OGC protocols
- **Layer Management**: Dynamic layer creation and management
- **Data Integration**: Connect to PostGIS database for spatial data storage
- **Styling**: Custom SLD-based styling for light pollution visualization
- **API Access**: RESTful API endpoints for programmatic access

## Architecture

### Server-side Components
- `lib/geoserver-service.js`: Core GeoServer service with REST API client
- API endpoints in `server.js` for:
  - Health checks
  - Layer management
  - Feature queries
  - WMS/WFS URL generation

### Client-side Components
- `js/geoserver-manager.js`: Browser-based GeoServer manager
- Dynamic WMS/WFS layer integration with Leaflet
- Feature querying and visualization

## Installation & Setup

### Prerequisites
- Docker and Docker Compose
- Project Nocturna application
- PostgreSQL with PostGIS extension

### Environment Variables
Update your `.env` file with the following:

```bash
# GeoServer Configuration
GEOSERVER_URL=http://localhost:8080/geoserver
GEOSERVER_ADMIN_USER=admin
GEOSERVER_ADMIN_PASSWORD=geoserver
GEOSERVER_WORKSPACE=nocturna
GEOSERVER_DATASTORE=nocturna_datastore

# PostGIS Database Configuration (for GeoServer)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=nocturna
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
```

### Docker Setup
The GeoServer service is already defined in your compose files:

```yaml
geoserver:
  image: kartoza/geoserver:2.24.1
  container_name: projectnocturna_geoserver
  ports:
    - "8080:8080"
  environment:
    - GEOSERVER_ADMIN_USER=${GEOSERVER_ADMIN_USER}
    - GEOSERVER_ADMIN_PASSWORD=${GEOSERVER_ADMIN_PASSWORD}
  volumes:
    - ./geoserver_data:/opt/geoserver/data_dir
  depends_on:
    - db  # Make sure PostGIS is available
```

Start the services:
```bash
docker-compose up -d
```

## API Endpoints

### Health Check
```
GET /api/geoserver/health
```

### Initialize Workspace
```
POST /api/geoserver/init
```

### Get Available Layers
```
GET /api/geoserver/layers
```

### Get Layer Details
```
GET /api/geoserver/layer/{layerName}
```

### Query Features
```
POST /api/geoserver/query
{
  "layerName": "light_pollution_measurements",
  "bounds": [-180, -90, 180, 90],
  "cqlFilter": "brightness > 15"
}
```

### Get WMS Template
```
GET /api/geoserver/wms-template/{layerName}
```

### Get WFS URL
```
GET /api/geoserver/wfs-url/{layerName}
```

## Usage Examples

### Adding a WMS Layer to the Map
```javascript
// Using the GeoServer manager
const wmsLayer = geoServerManager.addWmsLayer('light_pollution_composite', {
    format: 'image/png',
    transparent: true,
    opacity: 0.7
});
```

### Adding a WFS Layer to the Map
```javascript
// Using the GeoServer manager with custom styling
const wfsLayer = await geoServerManager.addWfsLayer(
    'light_pollution_measurements', 
    geoServerManager.createLightPollutionStyle()
);
```

### Querying Features
```javascript
const features = await geoServerManager.queryFeatures(
    'light_pollution_measurements',
    map.getBounds(),
    'brightness > 18'  // CQL filter
);
```

## Data Models

### Light Pollution Measurements
- `id`: Unique identifier
- `latitude`, `longitude`: Coordinates
- `sqm_value`: Sky Quality Meter reading
- `bortle_class`: Bortle scale classification
- `brightness`: Calculated brightness value
- `location`: Human-readable location
- `date_observed`: Observation date
- `source`: Data source

### Dark Sky Reserves
- `id`: Unique identifier
- `name`: Reserve name
- `designation`: Type of designation
- `country`: Country location
- `sqm`: Average SQM value
- `certification_date`: When certified

## Security Considerations
- Use strong passwords for GeoServer admin account
- Restrict network access to GeoServer in production
- Implement proper authentication for sensitive data
- Regular backups of GeoServer configuration

## Troubleshooting

### Connection Issues
- Verify GeoServer is running: `curl http://localhost:8080/geoserver`
- Check credentials in environment variables
- Confirm network connectivity between services

### Layer Issues
- Check that workspace and datastore exist
- Verify data source connectivity
- Review layer permissions

## Performance Optimization
- Use appropriate tile caching
- Optimize database indexes for spatial queries
- Implement layer filtering based on zoom level
- Use BBOX queries to limit data transfer

## Scaling Considerations
- Deploy GeoServer in clustered configuration
- Use dedicated database servers for large datasets
- Implement CDN for cached tiles
- Monitor resource usage and scale accordingly