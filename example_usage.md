# Loading Real Geographic Datasets: Complete Guide

This document provides step-by-step instructions for loading real geographic datasets into your PostGIS database and making them available in GeoServer.

## Prerequisites

First, make sure you have the necessary tools installed:

```bash
# Install GDAL tools (includes ogr2ogr)
sudo apt-get update
sudo apt-get install gdal-bin

# Install PostgreSQL client tools
sudo apt-get install postgresql-client

# Verify installations
ogr2ogr --version
psql --version
```

## Setting Up Database Connection

Before loading datasets, ensure your PostGIS database is set up:

```bash
# Connect to PostgreSQL and create a database with PostGIS extension
psql -h localhost -U postgres -c "CREATE DATABASE geodb;"
psql -h localhost -U postgres -d geodb -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

## Method 1: Using the Shell Script

The easiest way to load datasets is using the provided shell script:

### Load a Local File

```bash
# Make sure the script is executable
chmod +x load_datasets.sh

# Load a shapefile
./load_datasets.sh -f /path/to/your/data.shp -t my_layer

# Load a GeoJSON file
./load_datasets.sh -f /path/to/your/data.geojson -t my_layer

# Load with custom database credentials
DB_USER=myuser DB_PASSWORD=mypassword DB_NAME=mydb ./load_datasets.sh -f data.shp -t my_layer
```

### Download and Load Natural Earth Data

```bash
# Download and load country boundaries
./load_datasets.sh -n admin_0_countries

# Download and load rivers
./load_datasets.sh -n rivers_lake_centerlines

# Download and load populated places
./load_datasets.sh -n populated_places
```

## Method 2: Using the JavaScript Module

For programmatic access, you can use the JavaScript module:

```javascript
const DatasetLoader = require('./load_real_datasets.js');

// Database configuration
const dbConfig = {
  host: 'localhost',
  port: '5432',
  user: 'postgres',
  password: 'postgres',
  database: 'geodb'
};

const loader = new DatasetLoader(dbConfig);

// Load a local file
await loader.loadShapefile('/path/to/your/file.shp', 'my_table');

// Or download and load Natural Earth data
await loader.downloadAndLoadNaturalEarth('cultural', '110m', 'admin_0_countries');

// List tables in database
const tables = await loader.listTables();
console.log(tables);
```

## Loading Sample Datasets

Here are some useful datasets to get you started:

### 1. Natural Earth Data (Recommended for beginners)

Download country boundaries:
```bash
./load_datasets.sh -n admin_0_countries
```

Download populated places:
```bash
./load_datasets.sh -n populated_places
```

Download rivers:
```bash
./load_datasets.sh -n rivers_lake_centerlines
```

### 2. US Census TIGER/Line Files

For US-specific data, download from https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html

Then load with:
```bash
./load_datasets.sh -f tl_2020_us_state.shp -t us_states
```

### 3. OpenStreetMap Data

Download extracts from https://download.geofabrik.de/

Then load with:
```bash
./load_datasets.sh -f monaco-latest.shp.zip -t osm_monaco
```

## Publishing in GeoServer

After loading data into PostGIS, you need to publish it in GeoServer:

### 1. Access GeoServer Admin Panel

Open your browser and navigate to:
```
http://your-server-ip:8080/geoserver/web/
```
Default credentials: admin/geoserver

### 2. Add PostGIS Store

1. Go to "Stores" → "Add new Store" → "PostGIS"
2. Fill in the connection parameters:
   - Database: geodb (or your database name)
   - Host: your database host
   - Port: 5432
   - Schema: public
   - User: your database user
   - Password: your database password
3. Click "Save"

### 3. Publish Layer

1. On the next screen, select your newly loaded table
2. Configure the layer:
   - Set "Native SRS" to EPSG:4326 if not already set
   - Set "Declared SRS" to EPSG:4326
   - Click "Compute from data" for native BBOX
   - Click "Compute from native bounds" for LatLon BBOX
3. Under the "Publishing" tab:
   - Set the "Default Style" (e.g., polygon for areas, line for routes)
4. Click "Save"

### 4. Verify Publication

1. Go to "Layer Preview" or "Demo" in the left menu
2. Find your layer and click "OpenLayers" to preview it
3. You should see your geographic data displayed on a map

## Verifying Data in PostGIS

You can verify that your data was loaded correctly:

```bash
# Connect to database
psql -h localhost -U postgres -d geodb

# List all tables
SELECT table_name FROM information_schema.tables WHERE table_schema='public';

# Check number of records in a table
SELECT COUNT(*) FROM your_table_name;

# Check the spatial reference system
SELECT ST_SRID(wkb_geometry) FROM your_table_name LIMIT 1;

# Check the bounds of your data
SELECT ST_Extent(wkb_geometry) FROM your_table_name;

# Preview a few records
SELECT * FROM your_table_name LIMIT 5;
```

## Troubleshooting Common Issues

### Permission Issues
Make sure your database user has the necessary permissions:
```sql
GRANT ALL PRIVILEGES ON DATABASE geodb TO your_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO your_user;
```

### Coordinate System Issues
If features don't appear correctly, check and set the coordinate system:
```sql
-- Check current SRID
SELECT ST_SRID(wkb_geometry) FROM your_table LIMIT 1;

-- Update SRID if needed (commonly 4326 for WGS84)
UPDATE your_table SET wkb_geometry = ST_SetSRID(wkb_geometry, 4326);
```

### Large File Loading
For very large files, consider these options:
```bash
# Increase memory allocation during import
ogr2ogr -f "PostgreSQL" PG:"connection_string" -append -nln table_name \
  -lco SPATIAL_INDEX=GIST -gt 65536 -doo OGR_TRUNCATE=YES large_file.shp
```

## Additional Resources

- [Natural Earth Data](https://www.naturalearthdata.com/) - Free vector and raster map data
- [GDAL Documentation](https://gdal.org/) - For advanced data processing
- [PostGIS Documentation](https://postgis.net/documentation/) - For spatial SQL functions
- [GeoServer Documentation](http://docs.geoserver.org/) - For publishing and styling layers

With these tools and instructions, you should be able to load real geographic datasets into your PostGIS database and make them available through GeoServer for your Project Nocturna application.