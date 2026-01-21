import { NextRequest, NextResponse } from 'next/server';
import { PredictiveEngine } from '@/lib/predictive';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lon = parseFloat(searchParams.get('lon') || '0');
  const windowDays = parseInt(searchParams.get('windowDays') || '30');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 });
  }

  try {
    const anomalies = await PredictiveEngine.detectAnomalies(lat, lon, windowDays);
    return NextResponse.json({ anomalies, location: { lat, lon }, windowDays });
  } catch (e) {
    console.error('Anomaly detection error:', e);
    return NextResponse.json({ error: 'Anomaly detection failed' }, { status: 500 });
  }
}