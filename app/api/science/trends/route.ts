import { NextRequest, NextResponse } from 'next/server';
import { ScienceEngine } from '@/lib/science';

// Define the expected data point type
interface DataPoint {
  year: number;
  value: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lon } = body;

    // Fetch real historical data if lat/lon provided
    let series: DataPoint[] = [];

    if (lat && lon) {
      // For now, we'll use mock data since we don't have a getHistoricalRadiance function
      // In a real implementation, this would fetch from the database
      const pool = (await import('@/lib/database')).getPostGISPool();
      const query = `
        SELECT
          EXTRACT(YEAR FROM measured_at) as year,
          AVG(radiance) as avg_radiance
        FROM sqm_readings_enhanced
        WHERE ST_DWithin(location, ST_SetSRID(ST_Point($1, $2), 4326)::geography, 5000)
          AND measured_at >= NOW() - INTERVAL '10 years'
        GROUP BY EXTRACT(YEAR FROM measured_at)
        ORDER BY year
      `;

      const result = await pool.query(query, [lon, lat]);
      series = result.rows.map((row: any) => ({
        year: parseInt(row.year),
        value: parseFloat(row.avg_radiance) || 0
      }));
    }

    // Fallback if no data found (e.g. empty DB table) or no lat/lon provided (mock mode for UI test)
    if (!series || series.length < 2) {
      series = body.series || [];
    }

    if (series.length < 2) return NextResponse.json({ error: 'Not enough data for location' }, { status: 400 });

    // Perform linear regression to get trend
    const n = series.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    for (let i = 0; i < n; i++) {
      const x = series[i].year;
      const y = series[i].value;

      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const avgX = sumX / n;
    const avgY = sumY / n;

    // Calculate R-squared
    let ssTot = 0, ssReg = 0;
    for (let i = 0; i < n; i++) {
      const yPred = avgY + slope * (series[i].year - avgX);
      const yActual = series[i].value;
      ssReg += Math.pow(yPred - avgY, 2);
      ssTot += Math.pow(yActual - avgY, 2);
    }

    const rSquared = ssTot !== 0 ? ssReg / ssTot : 0;

    // Generate forecast
    const forecastYears = body.forecastYears || 5;
    const forecast = [];
    const lastYear = Math.max(...series.map(s => s.year));

    for (let i = 1; i <= forecastYears; i++) {
      const futureYear = lastYear + i;
      const predictedValue = avgY + slope * (futureYear - avgX);
      forecast.push({
        year: futureYear,
        value: predictedValue,
        type: 'forecast'
      });
    }

    // Get anomaly detection
    let anomaly = null;
    if (lat && lon) {
      try {
        anomaly = await ScienceEngine.detectAnomalies(lat, lon);
      } catch (err) {
        console.error('Anomaly detection failed:', err);
      }
    }

    return NextResponse.json({
      slope_per_year: slope,
      intercept: avgY - slope * avgX,
      r2: rSquared,
      forecast,
      historical: series.map(s => ({ ...s, type: 'historical' })),
      anomaly
    });
  } catch (e) {
    console.error('Trend analysis error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

