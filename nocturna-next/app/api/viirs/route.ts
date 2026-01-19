import { NextRequest } from 'next/server';
import { z } from 'zod';

// Define Zod schema for validation
const ViirsQuerySchema = z.object({
  year: z.string().regex(/^\d{4}$/).optional().default('2023'),
  month: z.string().regex(/^(0?[1-9]|1[0-2])?$/).optional(),
  bbox: z.string().optional()
});

export async function GET(request: NextRequest) {
  try {
    // Parse and validate query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = ViirsQuerySchema.safeParse(searchParams);
    
    if (!parsed.success) {
      return Response.json(
        { 
          error: 'Invalid parameters', 
          details: parsed.error.errors 
        }, 
        { status: 400 }
      );
    }

    const { year, month, bbox } = parsed.data;

    // Generate sample VIIRS data based on parameters
    const viirsData = generateSampleVIIRSData(bbox);

    // Calculate statistics
    const brightnessValues = viirsData.map(d => d.brightness);
    const avgBrightness = brightnessValues.length > 0 
      ? brightnessValues.reduce((a, b) => a + b, 0) / brightnessValues.length 
      : 15.3;
    const maxBrightness = brightnessValues.length > 0 ? Math.max(...brightnessValues) : 85.2;
    const minBrightness = brightnessValues.length > 0 ? Math.min(...brightnessValues) : 0.5;
    
    // Standard deviation calculation
    const stdDev = brightnessValues.length > 0 
      ? Math.sqrt(
          brightnessValues.reduce((acc, val) => acc + Math.pow(val - avgBrightness, 2), 0) / brightnessValues.length
        )
      : 12.4;

    return Response.json({
      source: 'NASA VIIRS Nighttime Lights (Sample Data)',
      year: parseInt(year),
      month: month || 'annual',
      date: new Date().toISOString(),
      count: viirsData.length,
      avg_brightness: Number(avgBrightness.toFixed(2)),
      min_brightness: Number(minBrightness.toFixed(2)),
      max_brightness: Number(maxBrightness.toFixed(2)),
      std_dev: Number(stdDev.toFixed(2)),
      note: 'Sample data generated for demonstration purposes',
      data: viirsData
    });
  } catch (error) {
    console.error('VIIRS API Error:', error);
    return Response.json(
      { 
        error: 'Failed to process request', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}

// Helper function to generate sample VIIRS data
function generateSampleVIIRSData(bbox?: string) {
  // Default bounding box if none provided (roughly continental US)
  const bounds = bbox 
    ? bbox.split(',').map(Number) 
    : [-125, 24, -66, 50]; // [minLon, minLat, maxLon, maxLat]
  
  const [minLon, minLat, maxLon, maxLat] = bounds;
  
  // Generate random points within the bounding box
  const dataPoints = [];
  const numPoints = Math.floor(Math.random() * 50) + 20; // 20-70 points
  
  for (let i = 0; i < numPoints; i++) {
    // Generate random coordinates within bounds
    const lat = minLat + Math.random() * (maxLat - minLat);
    const lon = minLon + Math.random() * (maxLon - minLon);
    
    // Generate brightness based on location (urban areas tend to be brighter)
    let brightness;
    if (Math.abs(lat - 37.7749) < 5 && Math.abs(lon - (-122.4194)) < 5) {
      // San Francisco area - higher brightness
      brightness = 70 + Math.random() * 25;
    } else if (Math.abs(lat - 40.7128) < 5 && Math.abs(lon - (-74.0060)) < 5) {
      // NYC area - higher brightness
      brightness = 75 + Math.random() * 20;
    } else if (Math.abs(lat - 34.0522) < 5 && Math.abs(lon - (-118.2437)) < 5) {
      // LA area - higher brightness
      brightness = 72 + Math.random() * 23;
    } else {
      // Rural areas - lower brightness
      brightness = 5 + Math.random() * 30;
    }
    
    dataPoints.push({
      id: `viirs-${Date.now()}-${i}`,
      lat: Number(lat.toFixed(6)),
      lng: Number(lon.toFixed(6)),
      brightness: Number(brightness.toFixed(2)),
      frp: Number((brightness * 0.7 + Math.random() * 10).toFixed(2)), // Fire Radiative Power approximation
      confidence: Math.random() > 0.5 ? 'high' : 'medium',
      date: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      source: 'VIIRS_DNB'
    });
  }
  
  return dataPoints;
}