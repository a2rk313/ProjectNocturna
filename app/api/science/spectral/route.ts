import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lon = parseFloat(searchParams.get('lon') || '0');

  if (!lat || !lon) return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 });

  // Spectral analysis would typically require multi-band satellite data (e.g. VIIRS DNB + others)
  // or ground measurements. Here we simulate a classification based on location/randomness for the MVP.

  // Deterministic "random" based on coords
  const val = (Math.abs(lat + lon) * 100) % 10;

  let typeClassification = 'Mixed LED/HPS';
  let cctRange = '3000K - 4000K';
  let blueLightIndex = 4.5; // 1-10 scale
  let biologicalDisruption = 'Moderate';
  let radianceRef = '0.45 nW/cm²/sr';

  if (val < 3) {
      typeClassification = 'High-Pressure Sodium (Warm)';
      cctRange = '< 2200K';
      blueLightIndex = 1.2;
      biologicalDisruption = 'Low';
  } else if (val > 7) {
      typeClassification = 'Cool White LED';
      cctRange = '> 5000K';
      blueLightIndex = 8.7;
      biologicalDisruption = 'Critical';
  }

  return NextResponse.json({
    metrics: {
      typeClassification,
      cctRange,
      blueLightIndex: blueLightIndex.toFixed(1),
      biologicalDisruption,
      radianceRef
    }
  });
}
