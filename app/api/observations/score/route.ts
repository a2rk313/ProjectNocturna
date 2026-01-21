import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const scoreSchema = z.object({
  lat: z.coerce.number(),
  lon: z.coerce.number(),
  date: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = scoreSchema.parse(body);

    // TODO: Integrate weather API and moon phase calculator
    // For now, return a random realistic score
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

    // Calculate Score (Simple heuristic)
    // 100 - (cloud * 2) - (moonIllum * 0.5)
    let score = 100 - (cloudCover * 2) - (moonIllum * 0.4);
    if (score < 0) score = 0;
    if (score > 100) score = 100;

    const recommendations = [
      "Perfect conditions for deep sky objects.",
      "Good visibility, slight moonlight interference.",
      "Okay for planets, too bright for galaxies.",
      "Poor conditions, try again later."
    ];
    let rec = recommendations[0];
    if (score < 80) rec = recommendations[1];
    if (score < 60) rec = recommendations[2];
    if (score < 40) rec = recommendations[3];

    return NextResponse.json({
      score: Math.round(score),
      details: {
        cloudCover: `${cloudCover}% (Clear)`,
        moonPhase: `${moonPhase} (${Math.round(phaseAge)}d)`,
        seeing: `${seeing}" (Average)`,
        lightPollution: 'Bortle 4 (Suburban)' // Ideally fetch from DB location layer
      },
      recommendation: rec
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
