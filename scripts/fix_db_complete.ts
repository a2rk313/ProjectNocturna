import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

const dbConfig = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER || 'nocturna',
    password: process.env.POSTGRES_PASSWORD || 'nocturna_dev_password_change_me',
    database: process.env.POSTGRES_DB || 'nocturna',
};

async function fix() {
    const client = new Client(dbConfig);
    try {
        await client.connect();
        console.log('Connected to DB');

        console.log('Enabling extensions...');
        await client.query('CREATE EXTENSION IF NOT EXISTS postgis;');
        await client.query('CREATE EXTENSION IF NOT EXISTS postgis_raster;');
        console.log('Extensions enabled.');

        const schemas = [
            '../db/init/001_postgis_schema.sql',
            '../db/init/002_extended_schema.sql',
            '../db/init/003_enhanced_schema.sql'
        ];

        for (const s of schemas) {
            const schemaPath = path.join(__dirname, s);
            console.log(`Applying schema: ${s}`);
            if (fs.existsSync(schemaPath)) {
                const sql = fs.readFileSync(schemaPath, 'utf-8');
                try {
                    await client.query(sql);
                    console.log(`Successfully applied ${s}`);
                } catch (e: any) {
                    console.warn(`Warning applying ${s}: ${e.message}`);
                }
            } else {
                console.warn(`Schema file not found: ${s}`);
            }
        }

    } catch (err) {
        console.error('Failed to fix DB:', err);
    } finally {
        await client.end();
    }
}

fix();
