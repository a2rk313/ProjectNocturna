import { NextRequest, NextResponse } from 'next/server';
import { PredictiveEngine } from '@/lib/predictive';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lon = parseFloat(searchParams.get('lon') || '0');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 });
  }

  try {
    const patterns = await PredictiveEngine.analyzeSeasonalPatterns(lat, lon);
    return NextResponse.json({ patterns, location: { lat, lon } });
  } catch (e) {
    console.error('Seasonal analysis error:', e);
    return NextResponse.json({ error: 'Seasonal analysis failed' }, { status: 500 });
  }
}