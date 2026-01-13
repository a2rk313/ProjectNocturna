# Loading Real Datasets into PostGIS and GeoServer

This guide explains how to load real geographic datasets into your PostGIS database and publish them in GeoServer.

## Prerequisites

Before starting, ensure you have:
- PostgreSQL with PostGIS extension installed
- GeoServer running and configured
- GDAL/OGR tools installed (`sudo apt-get install gdal-bin` or `brew install gdal`)
- Administrative access to your PostgreSQL database

## Method 1: Loading Shapefiles

Shapefiles are the most common format for geographic data.

### Using ogr2ogr (Recommended)

```bash
# Basic command to load shapefile into PostGIS
ogr2ogr -f "PostgreSQL" PG:"host=localhost user=username dbname=database password=password" \
  -append -progress -nln table_name shapefile.shp

# With spatial index creation
ogr2ogr -f "PostgreSQL" PG:"host=localhost user=username dbname=database password=password" \
  -append -progress -nln table_name -lco SPATIAL_INDEX=GIST shapefile.shp
```

### Example script for loading shapefiles:

```bash
#!/bin/bash
# load_shapefile.sh

DB_HOST="localhost"
DB_USER="username"
DB_PASSWORD="password"
DB_NAME="geodb"
SHAPEFILE_PATH="/path/to/your/shapefile.shp"
TABLE_NAME="my_layer"

ogr2ogr -f "PostgreSQL" PG:"host=$DB_HOST user=$DB_USER dbname=$DB_NAME password=$DB_PASSWORD" \
  -append -progress -nln $TABLE_NAME -lco SPATIAL_INDEX=GIST $SHAPEFILE_PATH
```

## Method 2: Loading GeoJSON

GeoJSON is increasingly popular for web mapping applications.

```bash
# Load GeoJSON into PostGIS
ogr2ogr -f "PostgreSQL" PG:"host=localhost user=username dbname=database password=password" \
  -append -progress -nln table_name data.geojson
```

## Method 3: Loading CSV with Coordinates

For tabular data with coordinates:

```bash
# Load CSV with X, Y columns
ogr2ogr -f "PostgreSQL" PG:"host=localhost user=username dbname=database password=password" \
  -oo X_POSSIBLE_NAMES=longitude,lon,x \
  -oo Y_POSSIBLE_NAMES=latitude,lat,y \
  -append -progress -nln table_name data.csv
```

## Method 4: Loading Raster Data

For satellite imagery or elevation models:

```bash
# Load raster data into PostGIS
raster2pgsql -s 4326 -I -C -M path/to/raster.tif -F -t auto schema.table_name | \
  psql -h localhost -U username -d database_name
```

## Publishing in GeoServer

Once data is loaded into PostGIS, you can publish it in GeoServer:

1. Open GeoServer Web Admin Interface (usually http://localhost:8080/geoserver)
2. Go to Stores → Add new Store → PostGIS
3. Fill in connection parameters:
   - Database: your database name
   - Host: your database host
   - Port: 5432 (default)
   - Schema: public (or your schema)
   - User: database username
   - Password: database password
4. Click Save
5. Select the layer you just loaded
6. Configure the layer settings:
   - Set bounding boxes (Compute from data and Compute from native bounds)
   - Set projection (typically EPSG:4326)
   - Set SRS (Spatial Reference System)
7. Publish the layer
8. Save

## Loading Sample Datasets

Here are some sources for sample datasets:

### Natural Earth Data
- Website: https://www.naturalearthdata.com/
- Good for: Countries, rivers, roads, etc.
- Format: Shapefile

### OpenStreetMap Data
- Download from: https://download.geofabrik.de/
- Good for: Detailed maps of regions
- Formats: PBF, Shapefile

### USGS EarthExplorer
- Website: https://earthexplorer.usgs.gov/
- Good for: Satellite imagery, DEMs
- Formats: GeoTIFF

### Census TIGER/Line Files
- Website: https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html
- Good for: US administrative boundaries
- Format: Shapefile

## Automated Loading Script

Create a script to automate the loading process:

```bash
#!/bin/bash
# batch_load_data.sh

DATABASE_URL="postgresql://username:password@localhost:5432/geodb"
DATA_DIR="./data"
SHP_FILES=$(find "$DATA_DIR" -name "*.shp")

for shp_file in $SHP_FILES; do
    echo "Loading $shp_file..."
    filename=$(basename "$shp_file")
    tablename="${filename%.*}"
    
    # Load to PostGIS
    ogr2ogr -f "PostgreSQL" "$DATABASE_URL" \
        -append -progress -nln "$tablename" \
        -lco SPATIAL_INDEX=GIST -lco PRECISION=NO "$shp_file"
    
    if [ $? -eq 0 ]; then
        echo "Successfully loaded $tablename"
    else
        echo "Failed to load $tablename"
    fi
done
```

## Verification Steps

After loading, verify your data:

1. Check table exists in PostGIS:
```sql
SELECT * FROM information_schema.tables WHERE table_name = 'your_table';
```

2. Check spatial info:
```sql
SELECT ST_SRID(wkb_geometry) FROM your_table LIMIT 1;
SELECT ST_Extent(wkb_geometry) FROM your_table;
```

3. Count features:
```sql
SELECT COUNT(*) FROM your_table;
```

## Troubleshooting Common Issues

### Coordinate System Issues
- Always specify the source coordinate system with `-s_srs` if known
- Reproject during import if needed: `-t_srs EPSG:4326`

### Memory Issues with Large Files
- Add `-gt 65536` to set group transactions size
- Consider tiling large rasters before import

### Character Encoding Issues
- Add `-lco ENCODING=UTF-8` to ogr2ogr command

### Performance Tips
- Create indexes after import:
```sql
CREATE INDEX idx_table_geom ON table_name USING GIST (wkb_geometry);
ANALYZE table_name;
```

This setup will give you real geographic data accessible through both PostGIS and GeoServer for your application.