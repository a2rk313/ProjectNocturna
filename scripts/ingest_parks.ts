import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

// Bun automatically loads .env files

const dbConfig = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER || 'nocturna',
    password: process.env.POSTGRES_PASSWORD || 'nocturna_dev_password_change_me',
    database: process.env.POSTGRES_DB || 'nocturna',
};

async function ingestParks(filePath: string) {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }

    const rawData = fs.readFileSync(filePath, 'utf-8');
    const geojson = JSON.parse(rawData);

    if (geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
        console.error('Invalid GeoJSON: Must be a FeatureCollection');
        process.exit(1);
    }

    const client = new Client(dbConfig);

    try {
        await client.connect();
        console.log(`Connected to DB. Ingesting ${geojson.features.length} features from ${path.basename(filePath)}...`);

        // Ensure table exists (basic schema for demo)
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.dark_sky_parks (
                id SERIAL PRIMARY KEY,
                name TEXT,
                designation TEXT,
                country TEXT,
                sqm NUMERIC,
                bortle INTEGER,
                location GEOMETRY(Geometry, 4326)
            );
            CREATE INDEX IF NOT EXISTS idx_dark_sky_parks_location ON public.dark_sky_parks USING GIST (location);
        `);

        // Clear existing data to remove mock entries
        console.log('Clearing existing dark sky parks data...');
        await client.query(`TRUNCATE public.dark_sky_parks;`);

        // Insert loop
        let inserted = 0;
        for (const feature of geojson.features) {
            const props = feature.properties || {};
            const geom = feature.geometry;

            // Convert GeoJSON geometry to PostGIS geometry
            // ST_GeomFromGeoJSON requires the geometry object as string
            const geomStr = JSON.stringify(geom);

            await client.query(`
                INSERT INTO public.dark_sky_parks (name, designation, country, sqm, bortle, location)
                VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_GeomFromGeoJSON($6), 4326))
            `, [
                props.name || 'Unknown',
                props.designation || 'Other',
                props.country || 'Unknown',
                props.sqm || null,
                props.bortle || null,
                geomStr
            ]);
            inserted++;
        }

        console.log(`Successfully ingested ${inserted} parks.`);

    } catch (err) {
        console.error('Error ingesting parks:', err);
    } finally {
        await client.end();
    }
}

const args = process.argv.slice(2);
if (args.length < 1) {
    console.log('Usage: bun run scripts/ingest_parks.ts <path-to-geojson>');
    // Default to sample if exists
    const defaultSample = 'data/sample_parks.geojson';
    if (fs.existsSync(defaultSample)) {
        console.log(`No file specified. Defaulting to ${defaultSample}...`);
        ingestParks(defaultSample);
    } else {
        process.exit(1);
    }
} else {
    ingestParks(args[0]);
}
