import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lon, policyId } = body;

    if (!lat || !lon) return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 });

    const { getPostGISPool } = await import('@/lib/db');
    const pool = getPostGISPool();

    const query = `
      SELECT ST_Value(raster, ST_SetSRID(ST_MakePoint($1, $2), 4326)) as rad
      FROM public.viirs_rasters
      WHERE ST_Intersects(raster, ST_SetSRID(ST_MakePoint($1, $2), 4326))
      LIMIT 1
    `;
    const res = await pool.query(query, [lon, lat]);
    const currentRadiance = res.rows[0]?.rad || 0;

    // Simulation logic: apply reduction factors based on policy
    let reductionFactor = 0.15; // default minor reduction
    let policyName = 'Baseline / Voluntary';

    if (policyId === 'shielding_v1') {
      reductionFactor = 0.45;
      policyName = 'Full Cut-off Shielding Ordinance';
    } else if (policyId === 'curfew_v1') {
      reductionFactor = 0.30;
      policyName = 'Midnight Dimming Policy';
    }

    const predictedReduction = (reductionFactor * 100).toFixed(0) + '%';
    const postPolicyRadiance = currentRadiance * (1 - reductionFactor);

    // Economic rough values
    const complianceCost = currentRadiance > 1.0 ? '$1.2M' : '$150k';
    const timeToROI = currentRadiance > 1.0 ? '2.5 years' : '4.2 years';

    return NextResponse.json({
      metrics: {
        policy: policyName,
        predictedReduction,
        complianceCost,
        timeToROI,
        currentRadiance: currentRadiance.toFixed(3),
        simulatedRadiance: postPolicyRadiance.toFixed(3)
      }
    });
  } catch (e) {
    return NextResponse.json({ error: 'Policy simulation failed' }, { status: 500 });
  }
}
