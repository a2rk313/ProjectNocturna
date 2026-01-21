import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDarkSkyParks, getDarkSkyParksNearLocation } from '@/lib/db';

const ParksQuerySchema = z.object({
  limit: z.preprocess((val) => val && val !== 'null' ? Number(val) : 20, z.number().min(1).max(100).default(20)),
  offset: z.preprocess((val) => val && val !== 'null' ? Number(val) : 0, z.number().min(0).default(0)),
  country: z.preprocess((val) => val && val !== 'null' ? String(val) : undefined, z.string().optional()),
  designation: z.preprocess((val) => val && val !== 'null' ? String(val) : undefined, z.string().optional()),
  lat: z.preprocess((val) => val && val !== 'null' ? Number(val) : undefined, z.number().optional()),
  lon: z.preprocess((val) => val && val !== 'null' ? Number(val) : undefined, z.number().optional()),
  radius: z.preprocess((val) => val && val !== 'null' ? Number(val) : 500, z.number().optional().default(500)),
});

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const params = {
            limit: searchParams.get('limit'),
            offset: searchParams.get('offset'),
            country: searchParams.get('country'),
            designation: searchParams.get('designation'),
            lat: searchParams.get('lat'),
            lon: searchParams.get('lon'),
            radius: searchParams.get('radius'),
        };

        const validated = ParksQuerySchema.parse(params);

        // If location parameters are provided, get parks near the location
        let parks;
        if (validated.lat !== undefined && validated.lon !== undefined) {
            // Use location-based query
            parks = await getDarkSkyParksNearLocation(
                validated.lat,
                validated.lon,
                validated.radius || 500, // Default to 500km if no radius specified
                validated.limit,
                validated.offset
            );
        } else {
            // Use regular query
            parks = await getDarkSkyParks(validated.limit, validated.offset);
        }

        // Filter by country/designation if provided
        let filteredParks = parks;
        if (validated.country) {
            filteredParks = filteredParks.filter((park: { country?: string; designation?: string }) =>
                park.country?.toLowerCase().includes(validated.country!.toLowerCase())
            );
        }
        if (validated.designation) {
            filteredParks = filteredParks.filter((park: { country?: string; designation?: string }) =>
                park.designation?.toLowerCase().includes(validated.designation!.toLowerCase())
            );
        }

        return NextResponse.json({
            success: true,
            data: filteredParks,
            count: filteredParks.length,
            query: validated
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({
                success: false,
                error: 'Invalid query parameters',
                details: error.errors
            }, { status: 400 });
        }

        console.error('Parks API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to retrieve parks data'
        }, { status: 500 });
    }
}

