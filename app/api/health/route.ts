import { NextRequest, NextResponse } from 'next/server';
import { getPostGISPool } from '@/lib/database';

export async function GET() {
    const status = {
        database: 'down',
        geoserver: 'down',
    };

    try {
        const db = getPostGISPool();
        await db.query('SELECT 1');
        status.database = 'up';
    } catch (e) {
        console.error('Health Check: DB connection failed');
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
