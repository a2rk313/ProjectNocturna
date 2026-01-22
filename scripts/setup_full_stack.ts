import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

// Load environment from .env file implicitly via Bun

const dbConfig = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER || 'nocturna',
    password: process.env.POSTGRES_PASSWORD || 'nocturna_dev_password_change_me',
    database: process.env.POSTGRES_DB || 'nocturna',
};

const GEOSERVER_URL = process.env.GEOSERVER_URL || 'http://localhost:8080/geoserver';
const AUTH = Buffer.from(`${process.env.GEOSERVER_ADMIN_USER || 'admin'}:${process.env.GEOSERVER_ADMIN_PASSWORD || 'geoserver'}`).toString('base64');
const HEADERS = {
    'Authorization': `Basic ${AUTH}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
};

const WORKSPACE = 'nocturna';
const STORE = 'nocturna_postgis';

async function main() {
    console.log('=== Project Nocturna Full Stack Setup ===');

    // 1. Database Setup
    console.log('\n--- Step 1: Database Initialization ---');
    const client = new Client(dbConfig);
    try {
        await client.connect();
        console.log('Connected to PostGIS.');

        // Read schema files
        const schemaFiles = [
            'db/init/003_enhanced_schema.sql'
        ];

        for (const file of schemaFiles) {
            if (fs.existsSync(file)) {
                console.log(`Applying schema: ${file}`);
                const sql = fs.readFileSync(file, 'utf-8');
                await client.query(sql);
            }
        }

        // Seed initial data
        console.log('Seeding initial data...');
        // (Re-using logic from seed_sqm_data.ts but simpler here)
        await client.query(`
            INSERT INTO public.dark_sky_parks_enhanced (external_id, name, designation, country, sqm, bortle, location, established)
            VALUES
            ('dsp_001', 'Death Valley National Park', 'National Park', 'USA', 21.8, 1, ST_SetSRID(ST_MakePoint(-116.9325, 36.5323), 4326), '2013-02-20'),
            ('dsp_002', 'Galloway Forest Park', 'Dark Sky Park', 'UK', 21.5, 2, ST_SetSRID(ST_MakePoint(-4.4500, 55.0500), 4326), '2009-11-16'),
            ('dsp_003', 'Aoraki Mackenzie', 'Reserve', 'New Zealand', 21.9, 1, ST_SetSRID(ST_MakePoint(170.1000, -43.7333), 4326), '2012-06-09')
            ON CONFLICT (external_id) DO NOTHING;
        `);
        console.log('Database setup complete.');

    } catch (e) {
        console.error('Database setup failed (skipping, assuming running environment may vary):', e.message);
    } finally {
        await client.end();
    }

    // 2. GeoServer Setup
    console.log('\n--- Step 2: GeoServer Configuration ---');
    try {
        // Check health
        const health = await fetch(`${GEOSERVER_URL}/rest/about/version`, { headers: HEADERS });
        if (health.ok) {
            console.log('GeoServer is up.');

            // Create Workspace
            await fetch(`${GEOSERVER_URL}/rest/workspaces`, {
                method: 'POST',
                headers: HEADERS,
                body: JSON.stringify({ workspace: { name: WORKSPACE } })
            });

            // Create/Update Store
            const storePayload = {
                dataStore: {
                    name: STORE,
                    connectionParameters: {
                        host: 'nocturna-postgis', // Internal Docker name
                        port: '5432',
                        database: 'nocturna',
                        user: 'nocturna',
                        passwd: 'nocturna_dev_password_change_me',
                        dbtype: 'postgis',
                        schema: 'public'
                    }
                }
            };

            // Try create
            const createStore = await fetch(`${GEOSERVER_URL}/rest/workspaces/${WORKSPACE}/datastores`, {
                method: 'POST',
                headers: HEADERS,
                body: JSON.stringify(storePayload)
            });

            if (createStore.status === 409) {
                // Exists, update
                await fetch(`${GEOSERVER_URL}/rest/workspaces/${WORKSPACE}/datastores/${STORE}`, {
                    method: 'PUT',
                    headers: HEADERS,
                    body: JSON.stringify(storePayload)
                });
                console.log('Data store updated.');
            } else if (createStore.ok) {
                console.log('Data store created.');
            }

            // Publish Layers
            const layers = ['dark_sky_parks_enhanced', 'sqm_readings_enhanced'];
            for (const layerName of layers) {
                const layerPayload = {
                    featureType: {
                        name: layerName,
                        nativeName: layerName,
                        title: layerName.replace(/_/g, ' '),
                        srs: 'EPSG:4326',
                        enabled: true
                    }
                };

                const res = await fetch(`${GEOSERVER_URL}/rest/workspaces/${WORKSPACE}/datastores/${STORE}/featuretypes`, {
                    method: 'POST',
                    headers: HEADERS,
                    body: JSON.stringify(layerPayload)
                });

                if (res.ok || res.status === 201) console.log(`Layer ${layerName} published.`);
                else if (res.status === 409) console.log(`Layer ${layerName} already exists.`);
                else console.warn(`Failed to publish ${layerName}: ${res.status}`);
            }

        } else {
            console.warn('GeoServer not reachable. Skipping configuration.');
        }
    } catch (e) {
        console.error('GeoServer setup failed:', e.message);
    }

    console.log('\n--- Setup Complete ---');
}

main();
