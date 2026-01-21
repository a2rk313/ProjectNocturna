import { NextRequest, NextResponse } from 'next/server';
import { ScienceEngine } from '@/lib/science';
import cacheManager from '@/lib/cache';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lon = parseFloat(searchParams.get('lon') || '0');
    const radius = parseFloat(searchParams.get('radius') || '5');

    if (!lat || !lon) {
        return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 });
    }

    // Create cache key based on parameters
    const cacheKey = `correlation:${lat.toFixed(4)}:${lon.toFixed(4)}:${radius}`;

    try {
        // Try to get from cache first
        const cachedResult = await cacheManager.get<any>(cacheKey);
        if (cachedResult) {
            console.log(`Cache hit for correlation: ${cacheKey}`);
            return NextResponse.json(cachedResult);
        }

        // If not in cache, compute the result
        console.log(`Cache miss for correlation: ${cacheKey}, computing...`);
        const correlation = await ScienceEngine.correlateSatelliteAndGround(lat, lon, radius);

        // Cache the result for 1 hour (3600 seconds)
        await cacheManager.set(cacheKey, correlation, 3600);

        return NextResponse.json(correlation);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
