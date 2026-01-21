import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { findDarkSkySitesNearby, getDarkSkyParks } from '@/lib/db';

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(1).max(1000).default(50),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const params = {
      lat: searchParams.get('lat'),
      lon: searchParams.get('lon'),
      radiusKm: searchParams.get('radiusKm'),
    };

    const validated = querySchema.parse(params);

    // Query PostGIS for real data
    // import { findDarkSkySitesNearby } from '@/lib/db'; needs to be added to imports
    const sites = await findDarkSkySitesNearby(
      validated.lat,
      validated.lon,
      validated.radiusKm
    );

    return NextResponse.json({ 
      success: true,
      sites,
      count: sites.length,
      query: validated 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters', details: error.errors }, { status: 400 });
    }
    console.error('Dark sky sites API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
