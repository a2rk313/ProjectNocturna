
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

// Bun loads .env automatically

const dbConfig = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER || 'nocturna',
    password: process.env.POSTGRES_PASSWORD || 'nocturna_dev_password_change_me',
    database: process.env.POSTGRES_DB || 'nocturna',
};

async function apply() {
    const client = new Client(dbConfig);
    try {
        await client.connect();
        console.log('Connected to DB');

        console.log('Ensuring extensions (postgis, postgis_raster) are enabled...');
        await client.query('CREATE EXTENSION IF NOT EXISTS postgis;');
        await client.query('CREATE EXTENSION IF NOT EXISTS postgis_raster;');

        const initDir = path.join(__dirname, '../db/init');
        const files = fs.readdirSync(initDir)
            .filter(f => f.endsWith('.sql'))
            .sort(); // Apply in 001, 002, 003 order

        for (const file of files) {
            const filePath = path.join(initDir, file);
            console.log(`Applying schema: ${file}`);
            const sql = fs.readFileSync(filePath, 'utf-8');
            try {
                await client.query(sql);
                console.log(`Successfully applied ${file}`);
            } catch (err: any) {
                // Ignore "already exists" errors to allow idempotency
                if (err.message.includes('already exists')) {
                    console.log(`Notice: Elements in ${file} already exist, skipping duplicates.`);
                } else {
                    throw err;
                }
            }
        }

        console.log('Master schema application completed successfully.');

    } catch (err) {
        console.error('Failed to apply schema:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

apply();
