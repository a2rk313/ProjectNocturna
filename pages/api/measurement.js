// pages/api/measurement.js - Measurement API for Next.js
export default function handler(req, res) {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: "Missing latitude or longitude" });
    }

    const numLat = parseFloat(lat);
    const numLng = parseFloat(lng);

    if (isNaN(numLat) || isNaN(numLng)) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    console.log(`📍 Measurement request for: ${numLat.toFixed(4)}, ${numLng.toFixed(4)}`);

    // Generate measurement based on location
    // Urban areas are more polluted (near equator, low elevation)
    const latFactor = Math.abs(numLat) / 90;
    const baseSQM = 22.0 - (latFactor * 3); // Poles: ~22, Equator: ~19

    // Add some randomness
    const finalSQM = baseSQM + (Math.random() * 1 - 0.5);
    const bortle = calculateBortle(finalSQM);

    res.status(200).json({
      lat: numLat,
      lng: numLng,
      sqm: finalSQM.toFixed(2),
      mag: bortle,
      date_observed: new Date().toISOString(),
      comment: 'Generated measurement based on location',
      is_research_grade: Math.random() > 0.7,
      distance_km: '0.00',
      source: 'Location-based Calculation',
      note: 'Configure database for real measurements'
    });

  } catch (err) {
    console.error('Measurement endpoint error:', err);
    res.status(500).json({
      error: "Failed to get measurement",
      message: err.message
    });
  }
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