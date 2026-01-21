export function computeStargazingScore(input: {
  cloudCoverPct: number; // 0..100
  moonIlluminationPct: number; // 0..100
  radiance_nw_cm2_sr: number; // VIIRS radiance (nW/cm²/sr)
}): { score: number; details: { cloud_ok: boolean; moon_ok: boolean; radiance_ok: boolean; notes: string[] } } {
  const notes: string[] = [];

  const cloud = clamp(input.cloudCoverPct, 0, 100);
  const moon = clamp(input.moonIlluminationPct, 0, 100);
  const rad = Math.max(0, input.radiance_nw_cm2_sr);

  // Heuristic thresholds (tunable):
  // - cloud <= 30%: good
  // - moon <= 25%: good
  // - radiance <= 10 nW/cm²/sr: good
  const cloud_ok = cloud <= 30;
  const moon_ok = moon <= 25;
  const radiance_ok = rad <= 10;

  if (cloud_ok) notes.push(`Cloud cover ${cloud.toFixed(0)}% is favorable.`);
  else notes.push(`Cloud cover ${cloud.toFixed(0)}% may block stars; aim for < 30%.`);

  if (moon_ok) notes.push(`Moon illumination ${moon.toFixed(0)}% is dark enough for faint targets.`);
  else notes.push(`Moon illumination ${moon.toFixed(0)}% will brighten the sky; aim for < 25%.`);

  if (radiance_ok) notes.push(`VIIRS radiance ${rad.toFixed(2)} nW/cm²/sr indicates low light pollution.`);
  else notes.push(`VIIRS radiance ${rad.toFixed(2)} nW/cm²/sr suggests brighter skies; seek darker areas.`);

  // Score: weighted penalties (cloud 45%, radiance 35%, moon 20%)
  const cloudScore = 100 - cloud; // linear
  const moonScore = 100 - moon;
  const radianceScore = 100 - clamp((rad / 50) * 100, 0, 100); // normalize 0..50+ -> 100..0

  const score = Math.round(0.45 * cloudScore + 0.35 * radianceScore + 0.2 * moonScore);

  return { score: clamp(score, 0, 100), details: { cloud_ok, moon_ok, radiance_ok, notes } };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

