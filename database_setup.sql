-- migrations/001_init.sql
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table for authentication
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Light measurements table (enhanced for real data)
CREATE TABLE light_measurements (
    id SERIAL PRIMARY KEY,
    sqm_reading DECIMAL(5,2) NOT NULL,
    bortle_class INTEGER CHECK (bortle_class BETWEEN 1 AND 9),
    measured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    device_type VARCHAR(50),
    notes TEXT,
    geom GEOMETRY(Point, 4326),
    is_research_grade BOOLEAN DEFAULT FALSE,
    source VARCHAR(100) DEFAULT 'unknown',
    altitude DECIMAL(8,2),
    humidity DECIMAL(5,2),
    temperature DECIMAL(5,2),
    moon_phase DECIMAL(3,2),
    cloud_cover DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by_user_id INTEGER REFERENCES users(id)
);

-- VIIRS satellite data cache
CREATE TABLE viirs_data (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    lat DECIMAL(9,6) NOT NULL,
    lon DECIMAL(9,6) NOT NULL,
    radiance DECIMAL(10,4),
    brightness DECIMAL(10,4),
    confidence VARCHAR(20),
    geom GEOMETRY(Point, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, lat, lon)
);

-- Dark sky parks and reserves
CREATE TABLE dark_sky_areas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    designation VARCHAR(50), -- 'Gold', 'Silver', 'Certified'
    country VARCHAR(100),
    sqm_avg DECIMAL(5,2),
    area_sqkm DECIMAL(10,2),
    established_date DATE,
    geom GEOMETRY(Polygon, 4326),
    source VARCHAR(100) DEFAULT 'IDA',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API usage tracking for commercial features
CREATE TABLE api_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    endpoint VARCHAR(255) NOT NULL,
    request_count INTEGER DEFAULT 1,
    response_size INTEGER,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription plans for commercial usage
CREATE TABLE subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    monthly_api_calls INTEGER,
    data_download_limit_mb INTEGER,
    features JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User subscriptions
CREATE TABLE user_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    plan_id INTEGER NOT NULL REFERENCES subscription_plans(id),
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_light_measurements_geom ON light_measurements USING GIST(geom);
CREATE INDEX idx_light_measurements_date ON light_measurements(measured_at);
CREATE INDEX idx_light_measurements_user ON light_measurements(created_by_user_id);
CREATE INDEX idx_viirs_data_geom ON viirs_data USING GIST(geom);
CREATE INDEX idx_viirs_data_date ON viirs_data(date);
CREATE INDEX idx_dark_sky_areas_geom ON dark_sky_areas USING GIST(geom);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_api_usage_user_date ON api_usage(user_id, created_at);
CREATE INDEX idx_api_usage_endpoint ON api_usage(endpoint);

-- Import real SQM data (example)
-- INSERT INTO light_measurements (sqm_reading, bortle_class, lat, lng, source)
-- VALUES 
-- (21.99, 1, 37.6018, -110.0137, 'Natural Bridges National Monument'),
-- (21.80, 2, 41.6631, -77.8236, 'Cherry Springs State Park');