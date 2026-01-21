-- 003_enhanced_schema.sql
-- Enhanced schema for real data ingestion with quality control

-- Enhanced Dark Sky Parks Table
CREATE TABLE IF NOT EXISTS public.dark_sky_parks_enhanced (
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

CREATE INDEX IF NOT EXISTS idx_dark_sky_parks_enhanced_location 
    ON public.dark_sky_parks_enhanced USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_dark_sky_parks_enhanced_country 
    ON public.dark_sky_parks_enhanced (country);
CREATE INDEX IF NOT EXISTS idx_dark_sky_parks_enhanced_designation 
    ON public.dark_sky_parks_enhanced (designation);

-- Enhanced SQM Readings Table
CREATE TABLE IF NOT EXISTS public.sqm_readings_enhanced (
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

CREATE INDEX IF NOT EXISTS idx_sqm_readings_enhanced_location 
    ON public.sqm_readings_enhanced USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_sqm_readings_enhanced_time 
    ON public.sqm_readings_enhanced (measured_at);
CREATE INDEX IF NOT EXISTS idx_sqm_readings_enhanced_station 
    ON public.sqm_readings_enhanced (station_id);
CREATE INDEX IF NOT EXISTS idx_sqm_readings_enhanced_quality 
    ON public.sqm_readings_enhanced (quality_score);

-- VIIRS Rasters Table
CREATE TABLE IF NOT EXISTS public.viirs_rasters (
    id SERIAL PRIMARY KEY,
    product TEXT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER,
    date DATE,
    satellite TEXT,
    version TEXT,
    file_path TEXT NOT NULL,
    raster RASTER,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_viirs_rasters_product_year 
    ON public.viirs_rasters (product, year);

-- Materialized Views for Performance
CREATE MATERIALIZED VIEW IF NOT EXISTS public.viirs_annual_composite AS
    SELECT 
        ST_Union(raster) as composite_raster,
        year,
        product
    FROM public.viirs_rasters
    WHERE product = 'VNP46A3'
    GROUP BY year, product
    WITH DATA;

CREATE INDEX IF NOT EXISTS idx_viirs_annual_composite_year 
    ON public.viirs_annual_composite (year);

CREATE MATERIALIZED VIEW IF NOT EXISTS public.viirs_latest AS
    SELECT 
        raster,
        year,
        created_at
    FROM public.viirs_rasters
    WHERE product = 'VNP46A1'
    ORDER BY created_at DESC
    LIMIT 1
    WITH DATA;

-- Refresh Tasks Table
CREATE TABLE IF NOT EXISTS public.refresh_tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    source TEXT NOT NULL,
    schedule TEXT NOT NULL,
    last_run TIMESTAMPTZ,
    next_run TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    config JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tasks_next_run 
    ON public.refresh_tasks (next_run);
CREATE INDEX IF NOT EXISTS idx_refresh_tasks_status 
    ON public.refresh_tasks (status);
