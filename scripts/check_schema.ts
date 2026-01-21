
import { getPostGISPool } from '../lib/db';

async function checkSchema() {
    const pool = getPostGISPool();
    try {
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('viirs_annual_stats', 'sqm_readings', 'biodiversity_hotspots', 'fire_points');
        `);
        console.log('Found tables:', res.rows.map((r: any) => r.table_name));

        if (res.rows.length < 4) {
            console.error('MISSING TABLES! Found only:', res.rows.length);
        } else {
            console.log('All 4 new tables exist.');
        }
    } catch (err) {
        console.error('DB Check Failed:', err);
    } finally {
        await pool.end();
    }
}

checkSchema();
