import { NextRequest, NextResponse } from 'next/server';
import { ScienceEngine } from '@/lib/science';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lon } = body;

    if (!lat || !lon) return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 });

    const assessment = await ScienceEngine.assessEcologicalImpact(lat, lon);

    return NextResponse.json(assessment);
  } catch (error) {
    console.error('Impact assessment error:', error);
    return NextResponse.json({ error: 'Failed to assess impact' }, { status: 500 });
  }
}
