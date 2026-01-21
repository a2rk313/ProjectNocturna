import { NextRequest, NextResponse } from 'next/server';
import { getPostGISPool } from '@/lib/database';

export async function GET() {
    const status = {
        database: 'down',
        geoserver: 'down',
    };

    try {
        const db = getPostGISPool();
        // Check for table existence and basic connectivity
        await db.query('SELECT count(*) FROM light_measurements');
        status.database = 'up';
    } catch (e: any) {
        // If the table doesn't exist but DB is up, we might consider it 'degraded' or 'up' but with schema issues.
        // For now, if the query fails (even if just table missing), we treat DB check as failed or log it.
        // However, 'SELECT 1' proves connectivity. The user requested specifically to query the table.
        // If the table is missing, this will throw.
        // Let's fallback to SELECT 1 if the specific table query fails, but log the schema issue?
        // Or strictly follow "expand the health check to actually query... to verify schema integrity".
        // So if it fails, database status should probably be reflected as such.
        // But if DB is connected but table missing, maybe we shouldn't say "DB connection failed".

        // Let's try to distinguish
        console.error('Health Check: DB/Schema validation failed:', e.message);

        // Fallback check to see if DB is at least reachable
        try {
            await db.query('SELECT 1');
            console.warn('Health Check: DB is connected but schema validation failed.');
            // We keep status.database = 'down' because schema is critical?
            // Or maybe we set it to 'up' but log the error?
            // The prompt implies we want to VERIFY schema integrity. So if it fails, health check should probably fail or report issue.
            // I'll leave it as failing the check if the table query fails.
        } catch (connErr) {
            console.error('Health Check: DB connection completely failed');
        }
    }

    try {
        const gsUrl = process.env.GEOSERVER_URL || 'http://localhost:8080/geoserver';

        // Try both the web UI and the REST API for a more thorough check
        const endpoints = [`${gsUrl}/web/`, `${gsUrl}/rest/info.json`];
        let gsUp = false;

        for (const url of endpoints) {
            try {
                const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) });
                if (res.ok) {
                    gsUp = true;
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        if (gsUp) status.geoserver = 'up';
    } catch (e) {
        console.error('Health Check: GeoServer connection failed');
    }

    const overall = status.database === 'up' && status.geoserver === 'up' ? 'healthy' : 'degraded';

    return NextResponse.json({ status: overall, components: status });
}
