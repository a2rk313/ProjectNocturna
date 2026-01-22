import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ScienceEngine } from '@/lib/science';

const scoreSchema = z.object({
  lat: z.coerce.number(),
  lon: z.coerce.number(),
  date: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = scoreSchema.parse(body);
    const { lat, lon } = validated;

    // 1. Get Real Light Pollution Data from Science Engine
    let mpsas = 21.0; // Default fallback
    let bortleClass = '4';
    let bortleDesc = 'Suburban/Rural Transition';

    try {
        const correlation = await ScienceEngine.correlateSatelliteAndGround(lat, lon);
        // Use the satellite estimate if available
        if (correlation.estimated_mpsas_from_satellite) {
            mpsas = parseFloat(correlation.estimated_mpsas_from_satellite);
        }
    } catch (e) {
        console.error("Failed to fetch light pollution data:", e);
    }

    // Determine Bortle Class based on MPSAS
    if (mpsas >= 21.75) { bortleClass = '1'; bortleDesc = 'Excellent Dark Sky'; }
    else if (mpsas >= 21.6) { bortleClass = '2'; bortleDesc = 'Typical Dark Sky'; }
    else if (mpsas >= 21.3) { bortleClass = '3'; bortleDesc = 'Rural Sky'; }
    else if (mpsas >= 20.8) { bortleClass = '4'; bortleDesc = 'Rural/Suburban Transition'; }
    else if (mpsas >= 19.1) { bortleClass = '5'; bortleDesc = 'Suburban Sky'; }
    else if (mpsas >= 18.0) { bortleClass = '6'; bortleDesc = 'Bright Suburban Sky'; }
    else if (mpsas >= 17.0) { bortleClass = '7'; bortleDesc = 'Suburban/Urban Transition'; }
    else if (mpsas >= 16.0) { bortleClass = '8'; bortleDesc = 'City Sky'; }
    else { bortleClass = '9'; bortleDesc = 'Inner-city Sky'; }

    // Dynamic Moon Phase Calculation
    const date = new Date();
    const cycleLength = 29.53;
    const knownNewMoon = new Date('2023-01-21T20:53:00'); // Reference new moon
    const diffTime = date.getTime() - knownNewMoon.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    const phaseAge = diffDays % cycleLength;
    let moonPhase = 'Unknown';
    let moonIllum = 0;

    if (phaseAge < 1.84) { moonPhase = 'New Moon'; moonIllum = 0; }
    else if (phaseAge < 5.53) { moonPhase = 'Waxing Crescent'; moonIllum = 25; }
    else if (phaseAge < 9.22) { moonPhase = 'First Quarter'; moonIllum = 50; }
    else if (phaseAge < 12.91) { moonPhase = 'Waxing Gibbous'; moonIllum = 75; }
    else if (phaseAge < 16.61) { moonPhase = 'Full Moon'; moonIllum = 100; }
    else if (phaseAge < 20.30) { moonPhase = 'Waning Gibbous'; moonIllum = 75; }
    else if (phaseAge < 23.99) { moonPhase = 'Last Quarter'; moonIllum = 50; }
    else { moonPhase = 'Waning Crescent'; moonIllum = 25; }

    // Mock Weather (Randomized for variety in demo)
    const cloudCover = Math.floor(Math.random() * 30); // 0-30%
    const seeing = (Math.random() * 2 + 3).toFixed(1); // 3.0 - 5.0 arcsec (Average)

    // Calculate Score
    // Weighting: Cloud (40%), Moon (20%), Light Pollution (40%)

    // Cloud Score: 0% cloud = 100, 100% cloud = 0.
    const cloudScore = Math.max(0, 100 - cloudCover * 1.5);

    // Moon Score: 0% illum = 100, 100% illum = 0.
    const moonScore = 100 - moonIllum;

    // LP Score: MPSAS 22 = 100, MPSAS 16 = 0.
    // (mpsas - 16) / 6 * 100
    const lpScore = Math.max(0, Math.min(100, (mpsas - 16) / 6 * 100));

    let totalScore = (cloudScore * 0.4) + (moonScore * 0.2) + (lpScore * 0.4);

    if (totalScore < 0) totalScore = 0;
    if (totalScore > 100) totalScore = 100;

    const recommendations = [
      "Perfect conditions for deep sky objects.",
      "Good visibility, slight moonlight interference.",
      "Okay for planets, too bright for galaxies.",
      "Poor conditions due to light/weather."
    ];
    let rec = recommendations[0];
    if (totalScore < 80) rec = recommendations[1];
    if (totalScore < 60) rec = recommendations[2];
    if (totalScore < 40) rec = recommendations[3];

    return NextResponse.json({
      score: Math.round(totalScore),
      details: {
        cloudCover: `${cloudCover}% (Clear)`,
        moonPhase: `${moonPhase} (${Math.round(phaseAge)}d)`,
        seeing: `${seeing}" (Average)`,
        lightPollution: `Bortle ${bortleClass} (${bortleDesc}, ${mpsas.toFixed(2)} mag/arcsec²)`
      },
      recommendation: rec
    });
  } catch (error) {
    console.error("Observation score error:", error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
