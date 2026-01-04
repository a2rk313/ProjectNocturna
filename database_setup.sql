-- database_setup.sql

-- 1. Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Drop table if exists to ensure schema update
DROP TABLE IF EXISTS measurements;

-- 3. Research-Grade Measurements Table
CREATE TABLE measurements (
    id SERIAL PRIMARY KEY,
    lat FLOAT CHECK (lat BETWEEN -90 AND 90),
    lng FLOAT CHECK (lng BETWEEN -180 AND 180),
    elevation NUMERIC,
    date_observed TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Sensor Data (Strict Range)
    sqm NUMERIC CHECK (sqm BETWEEN 14.0 AND 24.0), 
    mag NUMERIC CHECK (mag BETWEEN -2 AND 8),
    
    -- Contextual Data (New Fields)
    cloud_cover_pct INT DEFAULT 0,  -- 0 to 100
    moon_illumination FLOAT,        -- 0.0 (New) to 1.0 (Full)
    constellation VARCHAR(50),
    comment TEXT,
    
    -- Quality Assurance
    is_research_grade BOOLEAN DEFAULT FALSE,
    quality_score INT DEFAULT 0, -- 0 to 100 score
    
    geom GEOMETRY(POINT, 4326)
);

-- 4. Spatial & Quality Indices
CREATE INDEX idx_measurements_geom ON measurements USING GIST (geom);
CREATE INDEX idx_quality ON measurements (is_research_grade);