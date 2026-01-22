SET search_path TO public;

-- Project Nocturna - Light Pollution Monitoring Database Schema
-- Designed for PostGIS with spatial capabilities

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Table for citizen scientist light pollution measurements
CREATE TABLE light_measurements (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid(),
    measurement_datetime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    location GEOGRAPHY(POINT, 4326),
    latitude DECIMAL(9, 6),
    longitude DECIMAL(10, 6),
    sky_brightness_mag_arcsec2 DECIMAL(5, 2), -- Sky brightness in magnitudes per square arcsecond
    cloud_cover_percentage INTEGER CHECK (cloud_cover_percentage BETWEEN 0 AND 100),
    weather_conditions TEXT,
    moon_phase DECIMAL(3, 2), -- Moon phase factor (0-1)
    moon_altitude DECIMAL(4, 2), -- Moon altitude in degrees
    sensor_type VARCHAR(50), -- Type of sensor/device used
    observation_notes TEXT,
    image_url VARCHAR(255), -- URL to uploaded image
    measurement_quality_score DECIMAL(3, 2), -- Quality score (0-1)
    submitted_by_user_id UUID REFERENCES users(uuid),
    validation_status VARCHAR(20) DEFAULT 'pending', -- pending, validated, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for validated scientific measurements
CREATE TABLE scientific_measurements (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid(),
    measurement_datetime TIMESTAMP WITH TIME ZONE,
    location GEOGRAPHY(POINT, 4326),
    latitude DECIMAL(9, 6),
    longitude DECIMAL(10, 6),
    sky_brightness_mag_arcsec2 DECIMAL(5, 2),
    calibrated_sky_brightness_mag_arcsec2 DECIMAL(5, 2),
    spectral_data JSONB, -- Spectral information if available
    sensor_calibration_factor DECIMAL(5, 4),
    atmospheric_conditions JSONB, -- Temperature, humidity, pressure
    equipment_details JSONB, -- Detailed equipment info
    observer_expertise_level VARCHAR(20), -- novice, experienced, expert
    quality_control_notes TEXT,
    data_validated_by_user_id UUID,
    validation_timestamp TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for satellite light pollution data
CREATE TABLE satellite_light_data (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid(),
    acquisition_date DATE,
    location GEOGRAPHY(POINT, 4326),
    latitude DECIMAL(9, 6),
    longitude DECIMAL(10, 6),
    radiance_value DECIMAL(10, 6), -- Radiance value from satellite
    satellite_source VARCHAR(50), -- VIIRS, DMSP, etc.
    cloud_coverage_percentage INTEGER CHECK (cloud_coverage_percentage BETWEEN 0 AND 100),
    processing_algorithm VARCHAR(100),
    data_quality_flag INTEGER, -- Quality assessment
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for user profiles
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'citizen_scientist', -- citizen_scientist, researcher, admin
    expertise_level VARCHAR(20) DEFAULT 'novice', -- novice, experienced, expert
    organization_affiliation VARCHAR(255),
    profile_image_url VARCHAR(255),
    location GEOGRAPHY(POINT, 4326),
    bio TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for sensor metadata
CREATE TABLE sensors (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid(),
    sensor_name VARCHAR(100) NOT NULL,
    sensor_model VARCHAR(100),
    manufacturer VARCHAR(100),
    calibration_date DATE,
    calibration_expiration_date DATE,
    sensitivity DECIMAL(8, 6), -- Sensitivity in appropriate units
    field_of_view DECIMAL(5, 2), -- Field of view in degrees
    spectral_response JSONB, -- Spectral response curve
    owner_user_id UUID REFERENCES users(uuid),
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, retired
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE analysis_reports (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    report_type VARCHAR(50), -- trend_analysis, comparison, event_based
    author_user_id UUID REFERENCES users(uuid),
    generated_datetime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    parameters_used JSONB, -- Parameters used for the analysis
    methodology TEXT,
    summary_statistics JSONB, -- Statistical summary
    findings TEXT,
    recommendations TEXT,
    data_visualizations JSONB, -- Links or references to visualizations
    report_file_url VARCHAR(255), -- Link to downloadable report
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for environmental context
CREATE TABLE environmental_context (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid(),
    location GEOGRAPHY(POINT, 4326),
    latitude DECIMAL(9, 6),
    longitude DECIMAL(10, 6),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    temperature_celsius DECIMAL(5, 2),
    humidity_percentage INTEGER CHECK (humidity_percentage BETWEEN 0 AND 100),
    atmospheric_pressure_hpa DECIMAL(7, 2),
    wind_speed_ms DECIMAL(5, 2),
    visibility_km DECIMAL(5, 2),
    cloud_cover_percentage INTEGER CHECK (cloud_cover_percentage BETWEEN 0 AND 100),
    atmospheric_extinction_coefficient DECIMAL(5, 4),
    air_quality_index INTEGER,
    nearby_light_sources JSONB, -- List of nearby light sources
    urban_rural_classification VARCHAR(20), -- urban, suburban, rural, remote
    zenith_visibility_conditions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for quality control
CREATE TABLE quality_control (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid(),
    measurement_id INTEGER,
    measurement_table VARCHAR(30) CHECK (measurement_table IN ('light_measurements', 'scientific_measurements')),
    validator_user_id UUID REFERENCES users(uuid),
    quality_score DECIMAL(3, 2) CHECK (quality_score BETWEEN 0 AND 1), -- 0-1 scale
    validation_method VARCHAR(50), -- visual_inspection, cross_reference, algorithm
    validation_notes TEXT,
    is_valid BOOLEAN,
    validation_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for light source mapping
CREATE TABLE light_sources (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid(),
    location GEOGRAPHY(POINT, 4326),
    latitude DECIMAL(9, 6),
    longitude DECIMAL(10, 6),
    source_type VARCHAR(50), -- street_light, commercial, industrial, residential
    intensity_lumens BIGINT,
    color_temperature_kelvin INTEGER,
    height_meters DECIMAL(6, 2),
    azimuth_angle DECIMAL(5, 2), -- Direction angle
    tilt_angle DECIMAL(5, 2), -- Tilt from vertical
    shielded BOOLEAN DEFAULT FALSE,
    contributed_by_user_id UUID REFERENCES users(uuid),
    verification_status VARCHAR(20) DEFAULT 'unverified', -- unverified, verified, disputed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_light_measurements_location ON light_measurements USING GIST(location);
CREATE INDEX idx_light_measurements_datetime ON light_measurements(measurement_datetime);
CREATE INDEX idx_scientific_measurements_location ON scientific_measurements USING GIST(location);
CREATE INDEX idx_scientific_measurements_datetime ON scientific_measurements(measurement_datetime);
CREATE INDEX idx_satellite_data_location ON satellite_light_data USING GIST(location);
CREATE INDEX idx_satellite_data_date ON satellite_light_data(acquisition_date);
CREATE INDEX idx_environmental_context_location ON environmental_context USING GIST(location);
CREATE INDEX idx_environmental_context_datetime ON environmental_context(timestamp);
CREATE INDEX idx_users_location ON users USING GIST(location);
CREATE INDEX idx_light_sources_location ON light_sources USING GIST(location);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Attach the trigger to tables that have updated_at column
CREATE TRIGGER update_light_measurements_updated_at BEFORE UPDATE ON light_measurements FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_scientific_measurements_updated_at BEFORE UPDATE ON scientific_measurements FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_sensors_updated_at BEFORE UPDATE ON sensors FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_light_sources_updated_at BEFORE UPDATE ON light_sources FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_analysis_reports_updated_at BEFORE UPDATE ON analysis_reports FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

