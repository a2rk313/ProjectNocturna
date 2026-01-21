# Real Data Ingestion and Usage Tools

This directory contains enhanced tools for ingesting and managing real-world datasets for Project Nocturna.

## Tools Overview

### 1. Enhanced Parks Ingestion (`enhanced_park_ingestion.ts`)
- **Purpose**: Advanced ingestion of dark sky parks and reserves data
- **Features**:
  - Data validation with coordinate range checking
  - Batch processing for performance
  - Enhanced database schema with additional metadata
  - Conflict resolution (upserts)
  - Export capabilities (GeoJSON/CSV)
  - Quality scoring and statistics

**Usage**:
```bash
# Ingest parks from GeoJSON
bun run scripts/enhanced_park_ingestion.ts ingest data/real_parks_enhanced.geojson

# Export parks
bun run scripts/enhanced_park_ingestion.ts export exports/parks.geojson

# Generate statistics
bun run scripts/enhanced_park_ingestion.ts stats
```

### 2. Real-Time Measurements Ingestion (`realtime_ingestion.ts`)
- **Purpose**: Ingest and validate SQM (Sky Quality Meter) readings
- **Features**:
  - Data quality validation and outlier detection
  - Quality scoring algorithm
  - Support for CSV and JSON formats
  - Temporal and spatial queries
  - Automated cleanup of old/low-quality data

**Usage**:
```bash
# Ingest from CSV
bun run scripts/realtime_ingestion.ts csv data/sample_measurements.csv

# Validate without ingesting
bun run scripts/realtime_ingestion.ts validate data/measurements.csv

# Generate quality report
bun run scripts/realtime_ingestion.ts report

# Get latest measurements for location
bun run scripts/realtime_ingestion.ts latest 40.7128 -74.0060
```

### 3. VIIRS Satellite Data Pipeline (`viirs_pipeline.ts`)
- **Purpose**: Download, process, and ingest VIIRS nighttime lights data
- **Features**:
  - Multi-product support (nightly, monthly, annual)
  - Metadata tracking and provenance
  - Raster processing and database ingestion
  - Materialized views for performance
  - Automated scheduling capabilities

**Usage**:
```bash
# Download specific data
bun run scripts/viirs_pipeline.ts download nightly 2023

# Run full pipeline
bun run scripts/viirs_pipeline.ts pipeline "nightly,monthly" 2023,2024

# Generate reports
bun run scripts/viirs_pipeline.ts report

# Create raster views
bun run scripts/viirs_pipeline.ts views
```

### 4. Automated Data Refresh (`automated_refresh.ts`)
- **Purpose**: Schedule and manage automatic data updates
- **Features**:
  - Cron-based task scheduling
  - Configurable refresh intervals
  - Task status tracking
  - Notification system (webhook/email)
  - Error handling and retry logic

**Usage**:
```bash
# Start refresh service
bun run scripts/automated_refresh.ts start

# Check status
bun run scripts/automated_refresh.ts status

# Add custom task
bun run scripts/automated_refresh.ts add "0 */6 * * *" "My Task"

# Configure service
bun run scripts/automated_refresh.ts configure
```

### 5. Unified Data Manager (`data_manager.sh`)
- **Purpose**: CLI interface for all data management operations
- **Features**:
  - Unified command interface
  - Directory structure management
  - System status monitoring
  - File validation
  - Colored output and error handling

**Usage**:
```bash
# Setup data directories
./data_manager.sh setup

# Ingest parks
./data_manager.sh parks ingest data/real_parks_enhanced.geojson

# Ingest measurements
./data_manager.sh measurements ingest data/sample_measurements.csv

# Download VIIRS data
./data_manager.sh viirs download nightly 2023

# Start refresh service
./data_manager.sh refresh start

# Show system status
./data_manager.sh status
```

## Data Formats

### Parks Data (Enhanced GeoJSON)
```json
{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "properties": {
      "id": "unique-id",
      "name": "Park Name",
      "designation": "International Dark Sky Park",
      "country": "Country",
      "sqm": 21.8,
      "bortle": 2,
      "url": "https://example.com",
      "established": "2023-01-01",
      "area_km2": 1000.0
    },
    "geometry": {
      "type": "Point",
      "coordinates": [longitude, latitude]
    }
  }]
}
```

### Measurements Data (CSV)
```csv
station_id,latitude,longitude,mpsas,cloud_cover,temperature,humidity,equipment,observer,measured_at,source
SQM-001,40.7128,-74.0060,18.5,15,12.3,65,Sky Quality Meter L,Doe,2024-01-15T20:30:00Z,manual
```

## Database Schema Enhancements

### Enhanced Parks Table
```sql
CREATE TABLE public.dark_sky_parks_enhanced (
    id SERIAL PRIMARY KEY,
    external_id TEXT UNIQUE,
    name TEXT NOT NULL,
    designation TEXT,
    country TEXT,
    sqm NUMERIC CHECK (sqm >= 1 AND sqm <= 25),
    bortle INTEGER CHECK (bortle >= 1 AND bortle <= 9),
    area_km2 NUMERIC,
    established DATE,
    url TEXT,
    location GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Enhanced Measurements Table
```sql
CREATE TABLE public.sqm_readings_enhanced (
    id BIGSERIAL PRIMARY KEY,
    external_id TEXT UNIQUE,
    station_id TEXT NOT NULL,
    mpsas NUMERIC NOT NULL CHECK (mpsas >= 1 AND mpsas <= 25),
    cloud_cover NUMERIC CHECK (cloud_cover >= 0 AND cloud_cover <= 100),
    temperature NUMERIC,
    humidity NUMERIC,
    equipment TEXT,
    observer TEXT,
    source TEXT DEFAULT 'manual',
    quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
    location GEOMETRY(Point, 4326) NOT NULL,
    measured_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Quality Control

### Data Validation Rules
- **Coordinates**: Valid latitude (-90 to 90) and longitude (-180 to 180)
- **SQM Values**: Typical range 1-25 mag/arcsec²
- **Cloud Cover**: 0-100% range
- **Bortle Scale**: 1-9 classification
- **Temporal**: Valid date ranges and chronological order

### Quality Scoring Algorithm
- Base score: 100 points
- Deductions:
  - Cloud cover > 50%: -20 points
  - Cloud cover > 30%: -10 points
  - Missing equipment info: -10 points
  - Missing observer info: -5 points
  - Extreme SQM values (<5 or >22): -15 points

### Outlier Detection
- Uses IQR (Interquartile Range) method
- Flags values outside Q1 - 1.5×IQR and Q3 + 1.5×IQR
- Requires minimum 10 data points for statistical significance

## Automation

### Scheduled Tasks
- **VIIRS Nightly**: 2:00 AM daily
- **VIIRS Monthly**: 3:00 AM on 1st of month
- **Measurements Cleanup**: 1:00 AM every Sunday
- **Parks Update**: Weekly (configurable)

### Configuration Files
- `data/refresh_config.json`: Refresh service configuration
- `data/refresh_tasks.json`: Task scheduling and status
- `data/viirs_refresh_schedule.json`: VIIRS-specific schedule

## Integration Examples

### Setting up Automated Pipeline
```bash
# 1. Setup directories
./data_manager.sh setup

# 2. Configure refresh service
./data_manager.sh refresh configure

# 3. Ingest initial data
./data_manager.sh parks ingest data/real_parks_enhanced.geojson
./data_manager.sh measurements ingest data/sample_measurements.csv

# 4. Start automated service
./data_manager.sh refresh start
```

### Monitoring Data Quality
```bash
# Generate quality reports
./data_manager.sh measurements report

# Check system status
./data_manager.sh status

# Validate new data files
./data_manager.sh validate new_data.geojson
```

## Best Practices

1. **Always validate data before ingestion**
2. **Use batch processing for large datasets**
3. **Monitor quality scores and outlier detection**
4. **Schedule regular data refreshes**
5. **Keep metadata and provenance information**
6. **Implement proper error handling and logging**
7. **Use materialized views for frequently accessed data**
8. **Regular cleanup of old/low-quality data**

## Error Handling

All tools include comprehensive error handling:
- Input validation with clear error messages
- Database transaction rollback on errors
- Graceful degradation for missing dependencies
- Detailed logging for troubleshooting
- Status tracking for long-running operations
