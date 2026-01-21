-- 002_extended_schema.sql
-- Extension for Earth Observation, Ground Measurements, and Ecology

-- 1. VIIRS Annual Stats (for fast trend analysis without hitting raw rasters)
CREATE TABLE IF NOT EXISTS public.viirs_annual_stats (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    mean_radiance DOUBLE PRECISION,     -- nW/cm2/sr
    max_radiance DOUBLE PRECISION,
    lit_pixels_pct DOUBLE PRECISION,    -- % of area with light > detection threshold
    region_geom GEOMETRY(Polygon, 4326) -- The area this stat applies to (e.g. admin boundary or grid cell)
);
CREATE INDEX IF NOT EXISTS idx_viirs_annual_stats_geom ON public.viirs_annual_stats USING GIST (region_geom);
CREATE INDEX IF NOT EXISTS idx_viirs_annual_stats_year ON public.viirs_annual_stats (year);

-- 2. Biodiversity Hotspots / Sensitive Areas
CREATE TABLE IF NOT EXISTS public.biodiversity_hotspots (
    id SERIAL PRIMARY KEY,
    name TEXT,
    species_list TEXT[],       -- Array of scientific names
    threat_level TEXT,         -- e.g. 'Critically Endangered', 'Vulnerable'
    geom GEOMETRY(MultiPolygon, 4326)
);
CREATE INDEX IF NOT EXISTS idx_biodiversity_hotspots_geom ON public.biodiversity_hotspots USING GIST (geom);

-- 3. Ground Measurements (Extended)
CREATE TABLE IF NOT EXISTS public.sqm_readings (
    id BIGSERIAL PRIMARY KEY,
    station_id TEXT,
    measured_at TIMESTAMPTZ NOT NULL,
    mpsas DOUBLE PRECISION NOT NULL, -- mag/arcsec^2
    cloud_cover DOUBLE PRECISION,    -- 0-100%
    location GEOMETRY(Point, 4326)
);
CREATE INDEX IF NOT EXISTS idx_sqm_readings_loc ON public.sqm_readings USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_sqm_readings_time ON public.sqm_readings (measured_at);

-- 4. Active Fires (FIRMS)
CREATE TABLE IF NOT EXISTS public.fire_points (
    id BIGSERIAL PRIMARY KEY,
    acquired_at TIMESTAMPTZ NOT NULL,
    brightness DOUBLE PRECISION,
    confidence INTEGER,
    satellite TEXT, -- 'Terra', 'Aqua', 'Suomi NPP'
    location GEOMETRY(Point, 4326)
);
CREATE INDEX IF NOT EXISTS idx_fire_points_loc ON public.fire_points USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_fire_points_time ON public.fire_points (acquired_at);
