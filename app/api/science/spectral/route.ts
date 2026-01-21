import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lon = parseFloat(searchParams.get('lon') || '0');

  if (!lat || !lon) return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 });

  try {
    const { getPostGISPool } = await import('@/lib/db');
    const pool = getPostGISPool();

    const query = `
      SELECT ST_Value(raster, ST_SetSRID(ST_MakePoint($1, $2), 4326)) as rad
      FROM public.viirs_rasters
      WHERE ST_Intersects(raster, ST_SetSRID(ST_MakePoint($1, $2), 4326))
      LIMIT 1
    `;
    const res = await pool.query(query, [lon, lat]);
    const radiance = res.rows[0]?.rad || 0;

    let cctRange = '2700K - 3000K';
    let blueLightIndex = 0.15;
    let biologicalDisruption = 'Low';
    let typeClassification = 'PC-Amber / Warm LED';

    if (radiance > 5.0) {
      cctRange = '5000K - 6500K';
      blueLightIndex = 0.85;
      biologicalDisruption = 'Critical';
      typeClassification = 'High-Intensity Cool LED';
    } else if (radiance > 1.0) {
      cctRange = '4000K - 5000K';
      blueLightIndex = 0.60;
      biologicalDisruption = 'High';
      typeClassification = 'Standard Cool LED';
    } else if (radiance > 0.1) {
      cctRange = '3000K - 4000K';
      blueLightIndex = 0.40;
      biologicalDisruption = 'Medium';
      typeClassification = 'Neutral White LED';
    }

    return NextResponse.json({
      metrics: {
        cctRange,
        blueLightIndex,
        biologicalDisruption,
        typeClassification,
        radianceRef: radiance.toFixed(3)
      }
    });
  } catch (e) {
    return NextResponse.json({ error: 'Spectral analysis failed' }, { status: 500 });
  }
}
