# Project Nocturna - Database Setup Guide

## Overview
This guide describes how to set up the PostgreSQL/PostGIS database for Project Nocturna, a light pollution monitoring platform that supports both citizen science and professional research applications.

## Prerequisites
- PostgreSQL 12 or higher
- PostGIS extension
- Node.js (for data population scripts)

## Database Schema

The database consists of the following main tables:

### Core Tables
1. **light_measurements** - Citizen scientist observations
2. **scientific_measurements** - Professional-grade measurements
3. **satellite_light_data** - Satellite-based light pollution data
4. **users** - User accounts and profiles
5. **sensors** - Sensor metadata and calibration info
6. **environmental_context** - Environmental conditions during measurements
7. **quality_control** - Data validation and quality scores
8. **light_sources** - Mapping of artificial light sources
9. **analysis_reports** - Generated analysis reports

## Installation Steps

### 1. Install PostgreSQL and PostGIS
```bash
# On Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib postgis

# On macOS with Homebrew
brew install postgresql postgis

# On Windows
# Download from https://www.postgresql.org/download/windows/
# Install PostGIS from https://postgis.net/install/
```

### 2. Create Database and Enable Extensions
```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create the database
CREATE DATABASE light_pollution_db;

-- Connect to the new database
\c light_pollution_db;

-- Enable PostGIS extension
CREATE EXTENSION postgis;
```

### 3. Apply the Schema
Apply the schema from the provided SQL file:

```sql
\i light_pollution_schema.sql
```

### 4. Environment Configuration
Create a `.env` file in your project root:

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=light_pollution_db
DB_PASSWORD=your_password
DB_PORT=5432
```

### 5. Populate Database with Initial Data
Run the population script to add initial data:

```bash
node populate_database.js
```

## Key Features of the Schema

### Spatial Support
All location-based tables use the `GEOGRAPHY(POINT, 4326)` type for accurate global positioning and spatial queries.

### Data Validation
The schema includes:
- Check constraints for valid ranges
- Foreign key relationships
- UUID primary keys for distributed systems
- Timestamps for audit trails

### Scientific Rigor
- Separate tables for citizen science vs. professional measurements
- Quality control mechanisms
- Calibration tracking for sensors
- Environmental context recording

### Performance Optimizations
- Spatial indexes on geography columns
- Temporal indexes on datetime columns
- Proper normalization to reduce redundancy

## API Integration Points

The schema supports integration with various data sources:

### Satellite Data Sources
- VIIRS Day/Night Band data
- DMSP-OLS nighttime lights
- Future support for new satellite missions

### Ground-Based Sensors
- Unihedron SQM (Sky Quality Meter)
- TLS2591 photodiode sensors
- Custom spectrometer data

### Weather Services
Integration with weather APIs for environmental context:
- Temperature, humidity, pressure
- Cloud cover and visibility
- Atmospheric conditions

## Security Considerations

### User Roles
- `citizen_scientist`: Basic data submission rights
- `researcher`: Enhanced access for analysis
- `admin`: Full database access

### Data Privacy
- Personal information is stored separately
- Location precision can be adjusted for privacy
- GDPR-compliant data handling

## Maintenance

### Regular Tasks
1. Monitor database size growth
2. Update statistics: `ANALYZE;`
3. Vacuum regularly: `VACUUM ANALYZE;`
4. Backup procedures

### Performance Monitoring
- Query performance analysis
- Index usage monitoring
- Connection pooling optimization

## Sample Queries

### Find measurements in a specific area:
```sql
SELECT * FROM light_measurements 
WHERE ST_DWithin(location, ST_GeogFromText('POINT(-74.0060 40.7128)'), 10000);  -- 10km radius
```

### Get average light pollution by region:
```sql
SELECT 
    urban_rural_classification,
    AVG(sky_brightness_mag_arcsec2) as avg_brightness,
    COUNT(*) as measurement_count
FROM light_measurements lm
JOIN environmental_context ec ON ST_DWithin(lm.location, ec.location, 100)
GROUP BY urban_rural_classification;
```

## Troubleshooting

### Common Issues
1. **PostGIS not enabled**: Run `CREATE EXTENSION postgis;`
2. **Permission errors**: Check user roles and GRANT permissions
3. **Spatial queries slow**: Verify spatial indexes exist

### Error Messages
- "extension postgis does not exist": Install PostGIS extension
- "operator does not exist: geometry = geography": Check column types
- "function st_geogfromtext(unknown) does not exist": Verify PostGIS installation

## Updating the Schema

For future updates to the schema:
1. Create migration scripts
2. Test on development database
3. Apply to production during maintenance window
4. Update documentation

---

This database schema provides a solid foundation for collecting, storing, and analyzing light pollution data for both citizen science and professional research purposes.