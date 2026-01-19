-- Create extension for PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create light_measurements table with geometry column
CREATE TABLE IF NOT EXISTS light_measurements (
    id SERIAL PRIMARY KEY,
    location_name VARCHAR(255),
    geom GEOMETRY(Point, 4326) NOT NULL,
    brightness_value DECIMAL(5,2),
    brightness_unit VARCHAR(20) DEFAULT 'mag/arcsec²',
    measurement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    measurement_device VARCHAR(100),
    bortle_class INTEGER,
    sqm_reading DECIMAL(4,2),
    is_research_grade BOOLEAN DEFAULT FALSE,
    notes TEXT
);

-- Create GIST index for efficient spatial queries
CREATE INDEX idx_light_measurements_location ON light_measurements USING GIST(geom);

-- Insert some sample data
INSERT INTO light_measurements (
    location_name, 
    geom, 
    brightness_value, 
    bortle_class, 
    sqm_reading, 
    measurement_device, 
    is_research_grade
) VALUES 
('Natural Bridges NM', ST_SetSRID(ST_MakePoint(-110.0004, 37.6061), 4326), 21.7, 2, 21.7, 'SQM-L', TRUE),
('Cherry Springs SP', ST_SetSRID(ST_MakePoint(-77.9866, 41.3314), 4326), 21.5, 3, 21.5, 'SQM-L', TRUE),
('Central Idaho DR', ST_SetSRID(ST_MakePoint(-114.7509, 44.2721), 4326), 22.0, 1, 22.0, 'SQM-L', TRUE),
('NYC Central Park', ST_SetSRID(ST_MakePoint(-73.9654, 40.7829), 4326), 17.5, 9, 17.5, 'SQM-L', TRUE),
('LA Downtown', ST_SetSRID(ST_MakePoint(-118.2437, 34.0522), 4326), 16.8, 9, 16.8, 'SQM-L', TRUE);

-- Create dark_sky_places table
CREATE TABLE IF NOT EXISTS dark_sky_places (
    id SERIAL PRIMARY KEY,
    place_name VARCHAR(255) NOT NULL,
    place_type VARCHAR(50) CHECK (place_type IN ('Dark Sky Park', 'Dark Sky Reserve', 'Dark Sky Community', 'Dark Sky Monument')),
    geom GEOMETRY(Polygon, 4326),
    country VARCHAR(100),
    certification_date DATE,
    bortle_class_avg INTEGER,
    protection_status VARCHAR(20) DEFAULT 'protected',
    website_url VARCHAR(500),
    area_sq_km DECIMAL(10,2)
);

-- Create GIST index for dark sky places
CREATE INDEX idx_dark_sky_places_geom ON dark_sky_places USING GIST(geom);

-- Insert sample dark sky places
INSERT INTO dark_sky_places (
    place_name,
    place_type,
    geom,
    country,
    certification_date,
    bortle_class_avg,
    protection_status,
    website_url,
    area_sq_km
) VALUES 
('Natural Bridges National Monument',
 'Dark Sky Monument',
 ST_Buffer(ST_SetSRID(ST_MakePoint(-110.0004, 37.6061), 4326), 0.01),
 'United States',
 '2007-03-06',
 2,
 'protected',
 'https://www.nps.gov/nhbri/',
 6.7),
('Cherry Springs State Park',
 'Dark Sky Park',
 ST_Buffer(ST_SetSRID(ST_MakePoint(-77.9866, 41.3314), 4326), 0.01),
 'United States',
 '2008-08-20',
 3,
 'protected',
 'https://www.dcnr.pa.gov/StateParks/FindAPark/CherrySprings/Pages/default.aspx',
 1.3),
('Aoraki Mackenzie Dark Sky Reserve',
 'Dark Sky Reserve',
 ST_Buffer(ST_SetSRID(ST_MakePoint(170.0, -44.0), 4326), 0.1),
 'New Zealand',
 '2012-06-21',
 1,
 'protected',
 'https://www.aorakimackenzie.org.nz/',
 4367.0);

-- Create VIIRS data table
CREATE TABLE IF NOT EXISTS viirs_data (
    id SERIAL PRIMARY KEY,
    acquisition_date DATE,
    geom GEOMETRY(Point, 4326) NOT NULL,
    brightness DECIMAL(6,2),
    quality_flag INTEGER,
    source_sensor VARCHAR(50) DEFAULT 'VIIRS_DNB',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create GIST index for VIIRS data
CREATE INDEX idx_viirs_data_location ON viirs_data USING GIST(geom);

-- Create a view for quick access to recent measurements
CREATE OR REPLACE VIEW recent_light_measurements AS
SELECT 
    id,
    location_name,
    ST_X(geom) as longitude,
    ST_Y(geom) as latitude,
    brightness_value,
    bortle_class,
    sqm_reading,
    measurement_date,
    measurement_device
FROM light_measurements
WHERE measurement_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY measurement_date DESC;