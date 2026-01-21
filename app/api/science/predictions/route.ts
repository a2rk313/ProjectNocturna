import { NextRequest, NextResponse } from 'next/server';
import { PredictiveEngine } from '@/lib/predictive';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lon = parseFloat(searchParams.get('lon') || '0');
  const days = parseInt(searchParams.get('days') || '30');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 });
  }

  try {
    const predictions = await PredictiveEngine.predictLightPollution(lat, lon, days);
    return NextResponse.json({ predictions, location: { lat, lon }, daysAhead: days });
  } catch (e) {
    console.error('Prediction error:', e);
    return NextResponse.json({ error: 'Prediction failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lon, days = 30 } = body;

    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return NextResponse.json({ error: 'Invalid lat/lon' }, { status: 400 });
    }

    const predictions = await PredictiveEngine.predictLightPollution(lat, lon, days);
    return NextResponse.json({ predictions, location: { lat, lon }, daysAhead: days });
  } catch (e) {
    console.error('Prediction error:', e);
    return NextResponse.json({ error: 'Prediction failed' }, { status: 500 });
  }
}