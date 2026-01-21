import { getPostGISPool } from '../lib/database';

const LOCATIONS = [
  // Urban (Bright)
  { name: 'London', lat: 51.5074, lon: -0.1276, base_sqm: 17.5, variance: 0.5 },
  { name: 'New York', lat: 40.7128, lon: -74.0060, base_sqm: 16.8, variance: 0.4 },
  { name: 'Tokyo', lat: 35.6895, lon: 139.6917, base_sqm: 16.5, variance: 0.3 },
  // Rural / Dark Sky Parks (Dark)
  { name: 'Death Valley', lat: 36.5323, lon: -116.9325, base_sqm: 21.8, variance: 0.2 },
  { name: 'Galloway Forest', lat: 55.0500, lon: -4.4500, base_sqm: 21.5, variance: 0.3 },
  { name: 'Aoraki Mackenzie', lat: -43.7333, lon: 170.1000, base_sqm: 21.9, variance: 0.1 },
  // Mixed
  { name: ' suburban_sample', lat: 51.2, lon: -0.5, base_sqm: 19.5, variance: 0.5 }
];

async function seedSQM() {
  const pool = getPostGISPool();
  console.log('Seeding SQM data...');

  // Ensure table exists (schema should be there from 003_enhanced_schema.sql, but let's be safe)
  // Actually, let's assume the schema is present or `realtime_ingestion` created it.
  // If not, we might fail. But the previous steps showed `003_enhanced_schema.sql` exists.

  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 3);

  let totalInserted = 0;

  for (const loc of LOCATIONS) {
    console.log(`Generating data for ${loc.name}...`);

    // Generate one reading per week for 3 years
    let currentDate = new Date(startDate);
    const now = new Date();

    while (currentDate < now) {
      // Add seasonal variation (darker in winter)
      const month = currentDate.getMonth(); // 0-11
      // Northern hemisphere: Winter (Dec/Jan) is darker (higher SQM) naturally?
      // Actually clouds make urban brighter, rural darker.
      // Let's simplified seasonal wave: +0.2 in winter, -0.2 in summer
      const seasonal = Math.cos((month / 12) * 2 * Math.PI) * 0.2;

      // Random noise
      const noise = (Math.random() - 0.5) * loc.variance;

      // Trend: Slowly getting brighter (lower SQM) for urban?
      // Let's add a slight trend: -0.05 per year
      const yearsPassed = (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      const trend = -0.05 * yearsPassed;

      let sqm = loc.base_sqm + seasonal + noise + trend;
      sqm = Math.max(1, Math.min(25, sqm));

      const query = `
        INSERT INTO public.sqm_readings_enhanced
          (external_id, station_id, mpsas, cloud_cover, temperature, humidity,
           equipment, observer, source, quality_score, location, measured_at)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, 'seed', $9, ST_SetSRID(ST_MakePoint($10, $11), 4326), $12)
        ON CONFLICT (external_id) DO NOTHING
      `;

      const id = `${loc.name.replace(/\s+/g, '_')}_${currentDate.getTime()}`;

      try {
        await pool.query(query, [
          id,
          `STATION_${loc.name.toUpperCase().substring(0, 3)}`,
          sqm.toFixed(2),
          Math.floor(Math.random() * 100), // Cloud cover
          10 + Math.random() * 15, // Temp
          50 + Math.random() * 30, // Humidity
          'SQM-LU',
          'AutoSeeder',
          90 + Math.floor(Math.random() * 10), // Quality
          loc.lon,
          loc.lat,
          currentDate.toISOString()
        ]);
        totalInserted++;
      } catch (e) {
        console.error('Insert failed:', e);
      }

      // Advance 7 days
      currentDate.setDate(currentDate.getDate() + 7);
    }
  }

  console.log(`Seeding complete. Inserted ${totalInserted} records.`);
  await pool.end();
}

seedSQM().catch(console.error);
