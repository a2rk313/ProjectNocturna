// pages/api/viirs/[year].js - NASA VIIRS Data API for Next.js
import axios from 'axios';

export default async function handler(req, res) {
  const { year } = req.query;
  const { bbox } = req.query;

  console.log(`🌍 NASA VIIRS Request: year=${year}, bbox=${bbox}`);

  // Check if NASA API key exists
  if (!process.env.NASA_API_KEY) {
    console.log('⚠️ NASA API key not configured, using sample data');
    return res.status(200).json({
      source: 'NASA VIIRS Nighttime Lights (Sample Data)',
      year: year || 2023,
      month: req.query.month || 'annual',
      date: new Date().toISOString(),
      count: 150,
      avg_brightness: 15.3,
      min_brightness: 0.5,
      max_brightness: 85.2,
      std_dev: 12.4,
      note: 'Sample data used - NASA API key not configured. Get your free key at https://earthdata.nasa.gov/',
      data: generateSampleVIIRSData(bbox)
    });
  }

  try {
    let url;
    if (bbox) {
      try {
        const [minLon, minLat, maxLon, maxLat] = bbox.split(',').map(Number);
        // Validate bounding box
        if (isNaN(minLon) || isNaN(minLat) || isNaN(maxLon) || isNaN(maxLat)) {
          throw new Error('Invalid bounding box coordinates');
        }

        // Normalize longitude values to valid range (-180 to 180)
        let normalizedMinLon = ((minLon + 180) % 360);
        if (normalizedMinLon < 0) normalizedMinLon += 360;
        normalizedMinLon = normalizedMinLon - 180;

        let normalizedMaxLon = ((maxLon + 180) % 360);
        if (normalizedMaxLon < 0) normalizedMaxLon += 360;
        normalizedMaxLon = normalizedMaxLon - 180;

        // Ensure latitude values are within valid range (-90 to 90)
        const normalizedMinLat = Math.max(-90, Math.min(90, minLat));
        const normalizedMaxLat = Math.max(-90, Math.min(90, maxLat));

        // Check if the original range spans more than 180 degrees, which indicates
        // a wraparound that covers most of the globe
        const originalRange = Math.abs(maxLon - minLon);
        if (originalRange > 180) {
            // If the original range was > 180 degrees, it likely represents a wraparound
            // covering most of the globe. Use the global endpoint instead of area endpoint.
            console.log(`🌍 Large range detected (${originalRange.toFixed(2)}°), using global data`);
            url = `https://firms.modaps.eosdis.nasa.gov/api/country/csv/${process.env.NASA_API_KEY}/VIIRS_NOAA20_NTL/WLD/7`;
        } else {
            // Adjust longitude range if crossing antimeridian
            let finalMinLon = normalizedMinLon;
            let finalMaxLon = normalizedMaxLon;

            // If longitude range crosses the antimeridian (west > east),
            // we need to handle it differently since NASA API doesn't support this
            if (normalizedMinLon > normalizedMaxLon) {
                // These are just badly ordered coordinates after normalization
                // Simply swap them to ensure west < east
                finalMinLon = normalizedMaxLon;
                finalMaxLon = normalizedMinLon;
            }

            // Ensure final values are within bounds
            finalMinLon = Math.max(-180, Math.min(180, finalMinLon));
            finalMaxLon = Math.max(-180, Math.min(180, finalMaxLon));

            // NASA FIRMS API format: south/west/north/east
            url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${process.env.NASA_API_KEY}/VIIRS_NOAA20_NTL/${normalizedMinLat}/${finalMinLon}/${normalizedMaxLat}/${finalMaxLon}/7`;
        }
      } catch (coordError) {
        console.error('Bounding box error:', coordError);
        return res.status(200).json({
          source: 'NASA VIIRS (Sample - Invalid bbox)',
          year: year || 2023,
          count: 100,
          data: generateSampleVIIRSData()
        });
      }
    } else {
      // Global data
      url = `https://firms.modaps.eosdis.nasa.gov/api/country/csv/${process.env.NASA_API_KEY}/VIIRS_NOAA20_NTL/WLD/7`;
    }

    console.log(`🌐 Calling NASA API: ${url.replace(process.env.NASA_API_KEY, '***')}`);

    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Project-Nocturna/1.0'
      }
    });

    // Parse CSV response
    const lines = response.data.split('\n').filter(line => {
      return line.trim() && !line.startsWith('#') && !line.startsWith('latitude');
    });

    const data = lines.map(line => {
      const [lat, lon, brightness, frp, confidence, date] = line.split(',');
      return {
        lat: parseFloat(lat) || 0,
        lng: parseFloat(lon) || 0,
        brightness: parseFloat(brightness) || 0,
        frp: parseFloat(frp) || 0,
        confidence: confidence || 'low',
        date: date || new Date().toISOString().split('T')[0]
      };
    }).filter(d => d.brightness > 0);

    // Calculate statistics
    const brightnessValues = data.map(d => d.brightness);
    const avgBrightness = brightnessValues.length > 0 ?
      brightnessValues.reduce((a, b) => a + b) / brightnessValues.length : 15.3;
    const maxBrightness = brightnessValues.length > 0 ? Math.max(...brightnessValues) : 85.2;
    const minBrightness = brightnessValues.length > 0 ? Math.min(...brightnessValues) : 0.5;

    res.status(200).json({
      source: 'NASA VIIRS Nighttime Lights (NOAA-20)',
      year: year || 2023,
      month: req.query.month || 'annual',
      date: new Date().toISOString(),
      count: data.length,
      avg_brightness: avgBrightness.toFixed(2),
      min_brightness: minBrightness.toFixed(2),
      max_brightness: maxBrightness.toFixed(2),
      std_dev: calculateStdDev(brightnessValues).toFixed(2),
      data: data.slice(0, 1000) // Limit for performance
    });

  } catch (error) {
    console.error('❌ NASA VIIRS Error:', error.message);

    // Provide helpful error information
    if (error.response) {
      console.error(`NASA API Response: ${error.response.status} - ${error.response.statusText}`);

      // Handle specific NASA API errors
      if (error.response.status === 401) {
        console.error('NASA API key may be invalid or expired');
      } else if (error.response.status === 403) {
        console.error('NASA API access forbidden - check key permissions');
      } else if (error.response.status === 429) {
        console.error('NASA API rate limit exceeded');
      }
    }

    // Return comprehensive sample data
    res.status(200).json({
      source: 'NASA VIIRS Nighttime Lights (Sample - API Unavailable)',
      year: year || 2023,
      month: req.query.month || 'annual',
      count: 150,
      avg_brightness: '15.3',
      min_brightness: '0.5',
      max_brightness: '85.2',
      std_dev: '12.4',
      note: 'Using sample data due to NASA API unavailability. Sign up for a free NASA API key at https://earthdata.nasa.gov/',
      data: generateSampleVIIRSData(bbox),
      citation: 'Simulated data based on VIIRS DNB characteristics'
    });
  }
}

function generateSampleVIIRSData(bbox = null) {
  const data = [];
  let minLat = 0, maxLat = 0, minLng = 0, maxLng = 0;

  if (bbox) {
    try {
      [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(Number);
    } catch (e) {
      // Default to world view
      minLat = -90; maxLat = 90; minLng = -180; maxLng = 180;
    }
  } else {
    minLat = -90; maxLat = 90; minLng = -180; maxLng = 180;
  }

  // Generate more points in populated areas
  const numPoints = 150;

  for (let i = 0; i < numPoints; i++) {
    // Bias toward populated areas (mid-latitudes)
    const biasLat = Math.random() > 0.7 ?
      (minLat + maxLat) / 2 + (Math.random() * 40 - 20) :
      minLat + Math.random() * (maxLat - minLat);

    const biasLng = Math.random() > 0.7 ?
      (minLng + maxLng) / 2 + (Math.random() * 40 - 20) :
      minLng + Math.random() * (maxLng - minLng);

    // Urban areas are brighter
    const isUrban = Math.abs(biasLat) < 45 && Math.random() > 0.5;
    const brightness = isUrban ?
      Math.random() * 40 + 20 : // 20-60 for urban
      Math.random() * 20 + 5;   // 5-25 for rural

    data.push({
      lat: biasLat,
      lng: biasLng,
      brightness: brightness,
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      source: 'Sample VIIRS Data'
    });
  }

  return data;
}

function calculateStdDev(array) {
  if (!array || array.length === 0) return 0;
  const n = array.length;
  const mean = array.reduce((a, b) => a + b) / n;
  return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
}