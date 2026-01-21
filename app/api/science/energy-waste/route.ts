import { NextRequest, NextResponse } from 'next/server';
import { ScienceEngine } from '@/lib/science';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lon = parseFloat(searchParams.get('lon') || '0');

  if (!lat || !lon) return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 });

  try {
    const result = await ScienceEngine.estimateEnergyWaste(lat, lon);

    return NextResponse.json({
      metrics: {
        totalWaste: `${result.waste_kwh.toFixed(0)} kWh/yr`,
        cost: `$${result.cost.toFixed(2)} / yr`,
        co2: `${result.co2.toFixed(1)} kg`,
        potentialSavings: `${result.potentialSavings}%`
      }
    });
  } catch (error) {
    console.error('Energy waste estimation error:', error);
    return NextResponse.json({
      error: 'Failed to estimate energy waste'
    }, { status: 500 });
  }
}
