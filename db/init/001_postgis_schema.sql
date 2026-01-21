-- Project Nocturna: baseline schema for compliance verification

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_raster;

-- Minimal table to satisfy "Data in PostGIS" requirement
CREATE TABLE IF NOT EXISTS public.light_measurements (
  id BIGSERIAL PRIMARY KEY,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Radiance/brightness value (units depend on dataset; keep generic in scaffold)
  radiance DOUBLE PRECISION,
  source TEXT,
  location GEOMETRY(Point, 4326) NOT NULL
);

-- Spatial index for fast proximity queries (e.g., ST_DWithin)
CREATE INDEX IF NOT EXISTS idx_light_measurements_location
  ON public.light_measurements
  USING GIST (location);

