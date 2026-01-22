# Project Nocturna - Dark Sky WebGIS Platform

## Architecture Overview

This project implements a modern WebGIS platform for dark sky observations with the following architecture:

### Data Storage Layer
- **PostGIS**: Stores measurement data in a spatially-enabled PostgreSQL database
- **Tables**: `measurements` (for ground-based observations) and `viirs_data` (for satellite data)

### Service Layer
- **GeoServer**: Serves spatial data as OGC-compliant services (WMS/WFS)
- **Node.js Backend**: Provides API endpoints and data processing

### Frontend Layer
- **Leaflet Map**: Interactive web mapping interface
- **WMS Integration**: Consumes data from GeoServer
- **Dual Mode Interface**: Citizen science and scientific analysis modes

## Implementation Status

✅ **Data Storage (PostGIS)**: Implemented and working  
✅ **GeoServer Integration**: Configured in Docker  
✅ **WMS Layer Serving**: Code integrated in webgis.js  
✅ **Frontend Integration**: Leaflet WMS layer implemented  

## Setup Instructions

### 1. Start the Stack
```bash
docker compose up -d
```

### 2. Seed the Database
Wait for the containers to start, then:
```bash
# Check if seeding completed
docker compose logs app
```

### 3. Configure GeoServer (Manual Step)
1. Access GeoServer at http://localhost:8080/geoserver
2. Login with credentials from `.env` file
3. Follow the steps in `GEOSERVER_SETUP.md` to create workspace, store, and layer

### 4. Access the Application
- Main App: http://localhost:3000
- GeoServer: http://localhost:8080/geoserver

## Key Features

- **Dual User Modes**: Citizen science and scientific analysis interfaces
- **Interactive Drawing Tools**: Polygon and marker drawing capabilities
- **Multiple Data Layers**: Ground measurements, VIIRS nighttime lights, dark sky parks
- **Location Comparison**: Side-by-side location analysis
- **Real-time Data Access**: Direct integration with PostGIS database

## Technical Details

### GeoServer WMS Layer
The frontend connects to the GeoServer WMS service to display ground measurements:
- Endpoint: `/geoserver/nocturna/wms`
- Layer: `nocturna:measurements`
- Format: PNG with transparency

### Data Flow
1. CSV data → PostgreSQL/PostGIS (via seeding)
2. PostGIS → GeoServer WMS layer (manual configuration)
3. GeoServer WMS → Leaflet map (frontend display)
4. Interactive popups → Direct database queries (API endpoints)

## Verification

To verify the implementation:
1. Check that the database has been seeded with measurement data
2. Confirm GeoServer is running and accessible
3. Configure the WMS layer in GeoServer
4. Verify the layer appears in the web application
5. Test layer visibility toggling in the UI

The architecture now properly stores data in PostGIS and serves at least one layer (ground measurements) via GeoServer WMS, meeting the project requirements.