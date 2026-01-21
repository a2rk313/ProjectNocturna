import { NextRequest, NextResponse } from 'next/server';
import { ScienceEngine } from '@/lib/science';

export async function POST(request: NextRequest) {
    try {
        const { lat, lon } = await request.json();

        if (!lat || !lon) {
            return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 });
        }

        const assessment = await ScienceEngine.assessEcologicalImpact(lat, lon);

        return NextResponse.json(assessment);

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
