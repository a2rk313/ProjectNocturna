import { Client } from 'pg';
// Bun automatically loads .env files


const dbConfig = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER || 'nocturna',
    password: process.env.POSTGRES_PASSWORD || 'nocturna_dev_password_change_me',
    database: process.env.POSTGRES_DB || 'nocturna',
};

async function seed() {
    const client = new Client(dbConfig);

    try {
        console.log(`Connecting to database at ${dbConfig.host}:${dbConfig.port}...`);
        await client.connect();
        console.log('Connected.');

        // Sample data: London and New York coordinates
        const samples = [
            {
                location: 'POINT(-0.1276 51.5074)', // London
                radiance: 55.2,
                source: 'Sample Seed',
            },
            {
                location: 'POINT(-74.0060 40.7128)', // New York
                radiance: 88.5,
                source: 'Sample Seed',
            },
            {
                location: 'POINT(139.6917 35.6895)', // Tokyo
                radiance: 92.1,
                source: 'Sample Seed',
            },
        ];

        console.log(`Inserting ${samples.length} sample records into light_measurements...`);

        const query = `
      INSERT INTO light_measurements (location, radiance, source)
      VALUES (ST_GeomFromText($1, 4326), $2, $3)
      RETURNING id;
    `;

        for (const sample of samples) {
            const res = await client.query(query, [sample.location, sample.radiance, sample.source]);
            console.log(`Inserted record ID: ${res.rows[0].id}`);
        }

        console.log('Seeding complete.');
    } catch (err) {
        console.error('Error seeding database:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

seed();
