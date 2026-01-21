import { NextRequest, NextResponse } from 'next/server';
import { ScienceEngine } from '@/lib/science';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lon = parseFloat(searchParams.get('lon') || '0');

  if (!lat || !lon) return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 });

  try {
    const result = await ScienceEngine.assessEcologicalImpact(lat, lon);

    // If no real data, fallback or return empty
    if (!result) {
      // Fallback for demo if DB empty
      return NextResponse.json({
        metrics: {
          riskLevel: 'Unknown',
          affectedSpecies: 'No data for region',
          radianceOverlap: '0 nW/cm2sr',
          recommendation: 'Conduct local survey.'
        }
      });
    }

    return NextResponse.json({
      metrics: {
        riskLevel: result.impactLevel,
        affectedSpecies: result.affectedSpecies.join(', '),
        radianceOverlap: 'Calculated based on proximity to habitats',
        recommendation: result.threats.join('; ')
      }
    });
  } catch (error) {
    console.error('Ecology impact assessment error:', error);
    return NextResponse.json({
      error: 'Failed to assess ecological impact'
    }, { status: 500 });
  }
}
