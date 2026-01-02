-- 1. Create the extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Create the measurements table (replaces CSV)
CREATE TABLE measurements (
    id SERIAL PRIMARY KEY,
    lat FLOAT,
    lng FLOAT,
    elevation NUMERIC,
    date_observed DATE,
    sqm NUMERIC,
    mag NUMERIC,
    constellation VARCHAR(50),
    comment TEXT,
    geom GEOMETRY(POINT, 4326)
);

-- 3. Create spatial index for fast nearest-neighbor search
CREATE INDEX idx_measurements_geom ON measurements USING GIST (geom);

-- 4. Import logic (Run this inside your backend or via a CSV tool)
-- Example Query to find nearest point:
-- SELECT *, ST_Distance(geom, ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography) as dist 
-- FROM measurements ORDER BY geom <-> ST_SetSRID(ST_MakePoint($lng, $lat), 4326) LIMIT 1;