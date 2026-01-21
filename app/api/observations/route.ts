import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ObservationSchema = z.object({
  observer_name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
    name: z.string().optional(),
  }),
  observation_data: z.object({
    mpsas: z.number().min(1).max(25), // magnitudes per square arcsecond
    bortle_scale: z.number().min(1).max(9),
    cloud_cover: z.number().min(0).max(100),
    moon_phase: z.string().optional(),
    comments: z.string().max(1000).optional(),
    equipment: z.string().optional(),
  }),
  observed_at: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ObservationSchema.parse(body);

    // Import database functions dynamically
    const { getPostGISPool } = await import('@/lib/database');
    const pool = getPostGISPool();

    // Insert observation into database
    const query = `
      INSERT INTO public.sqm_readings (
        station_id, 
        measured_at, 
        mpsas, 
        cloud_cover, 
        location
      ) VALUES (
        $1, 
        $2, 
        $3, 
        $4, 
        ST_SetSRID(ST_MakePoint($5, $6), 4326)
      ) 
      RETURNING id, measured_at
    `;

    const result = await pool.query(query, [
      validatedData.observer_name,
      validatedData.observed_at || new Date().toISOString(),
      validatedData.observation_data.mpsas,
      validatedData.observation_data.cloud_cover,
      validatedData.location.lon,
      validatedData.location.lat,
    ]);

    return NextResponse.json({
      success: true,
      data: {
        id: result.rows[0].id,
        observed_at: result.rows[0].measured_at,
        message: 'Observation recorded successfully'
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid observation data',
        details: error.errors
      }, { status: 400 });
    }

    console.error('Observation submission error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to record observation'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lon = parseFloat(searchParams.get('lon') || '0');
    const radius = parseFloat(searchParams.get('radius') || '10');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Validate parameters
    if (isNaN(lat) || isNaN(lon) || isNaN(radius) || isNaN(limit)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid parameters'
      }, { status: 400 });
    }

    const { getPostGISPool } = await import('@/lib/database');
    const pool = getPostGISPool();

    const query = `
      SELECT 
        id,
        station_id,
        measured_at,
        mpsas,
        cloud_cover,
        ST_Y(location::geometry) as lat,
        ST_X(location::geometry) as lon
      FROM public.sqm_readings
      WHERE ST_DWithin(
        location::geography, 
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 
        $3 * 1000
      )
      ORDER BY measured_at DESC
      LIMIT $4
    `;

    const result = await pool.query(query, [lon, lat, radius, limit]);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      query: { lat, lon, radius, limit }
    });

  } catch (error) {
    console.error('Observation retrieval error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve observations'
    }, { status: 500 });
  }
}
