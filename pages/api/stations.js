// pages/api/stations.js - Stations API for Next.js
export default function handler(req, res) {
  try {
    console.log('📊 Fetching station data...');

    // Generate sample stations data
    const sampleStations = generateSampleStations(50);

    res.status(200).json(sampleStations);

  } catch (error) {
    console.error('Stations error:', error);
    // Return generated data
    res.status(200).json(generateSampleStations(30));
  }
}

function generateSampleStations(count = 30) {
  const stations = [];
  const devices = ['SQM-LE', 'SQM-LU', 'SQM', 'Unihedron', 'DIY'];
  const sources = ['Citizen Scientist', 'Research Institution', 'University', 'Amateur Astronomer'];

  for (let i = 0; i < count; i++) {
    // More stations in populated areas
    const lat = 20 + Math.random() * 50 - 25; // Mostly mid-latitudes
    const lng = -100 + Math.random() * 200 - 100; // Focus on Americas/Europe

    const sqm = 19.5 + Math.random() * 2.5; // 19.5-22
    const isResearch = Math.random() > 0.6;

    stations.push({
      id: `station_${i + 1}`,
      lat: parseFloat(lat.toFixed(4)),
      lng: parseFloat(lng.toFixed(4)),
      sqm: sqm.toFixed(2),
      mag: calculateBortle(sqm),
      date_observed: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      is_research_grade: isResearch,
      source: isResearch ? 'Research Network' : sources[Math.floor(Math.random() * sources.length)],
      device_type: devices[Math.floor(Math.random() * devices.length)],
      notes: isResearch ? 'Calibrated measurement' : 'Citizen science observation'
    });
  }

  return stations;
}

function calculateBortle(sqm) {
  if (!sqm) return 5;
  if (sqm >= 21.99) return 1;
  if (sqm >= 21.89) return 2;
  if (sqm >= 21.69) return 3;
  if (sqm >= 20.49) return 4;
  if (sqm >= 19.50) return 5;
  if (sqm >= 18.94) return 6;
  if (sqm >= 18.38) return 7;
  if (sqm >= 17.80) return 8;
  return 9;
}