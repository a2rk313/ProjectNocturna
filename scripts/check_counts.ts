import { Client } from 'pg';

const dbConfig = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER || 'nocturna',
    password: process.env.POSTGRES_PASSWORD || 'nocturna_dev_password_change_me',
    database: process.env.POSTGRES_DB || 'nocturna',
};

async function check() {
    const client = new Client(dbConfig);
    try {
        await client.connect();
        const resReadings = await client.query('SELECT COUNT(*) FROM sqm_readings_enhanced;');
        const resParks = await client.query('SELECT COUNT(*) FROM dark_sky_parks_enhanced;');
        console.log(`Readings: ${resReadings.rows[0].count}`);
        console.log(`Parks: ${resParks.rows[0].count}`);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

check();
