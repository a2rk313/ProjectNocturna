// pages/api/dark-sky-parks.js - Dark Sky Parks API for Next.js
export default function handler(req, res) {
  try {
    const { lat, lng, radius = 100 } = req.query;

    // Real dark sky park data (expanded list)
    const darkSkyParks = [
      {
        name: "Natural Bridges National Monument",
        lat: 37.6018,
        lng: -110.0137,
        designation: "Gold",
        country: "USA",
        sqm: 21.99,
        area_sqkm: 31,
        established_date: "2007-03-06",
        source: "International Dark-Sky Association"
      },
      {
        name: "Cherry Springs State Park",
        lat: 41.6631,
        lng: -77.8236,
        designation: "Gold",
        country: "USA",
        sqm: 21.80,
        area_sqkm: 42,
        established_date: "2008-06-11",
        source: "International Dark-Sky Association"
      },
      {
        name: "Galloway Forest Park",
        lat: 55.0733,
        lng: -4.3970,
        designation: "Gold",
        country: "UK",
        sqm: 21.70,
        area_sqkm: 774,
        established_date: "2009-11-16",
        source: "International Dark-Sky Association"
      },
      {
        name: "Aoraki Mackenzie International Dark Sky Reserve",
        lat: -43.7333,
        lng: 170.1000,
        designation: "Gold",
        country: "New Zealand",
        sqm: 21.90,
        area_sqkm: 4300,
        established_date: "2012-06-09",
        source: "International Dark-Sky Association"
      },
      {
        name: "Death Valley National Park",
        lat: 36.5323,
        lng: -116.9325,
        designation: "Gold",
        country: "USA",
        sqm: 21.85,
        area_sqkm: 13767,
        established_date: "2013-02-20",
        source: "International Dark-Sky Association"
      },
      {
        name: "Mont-Mégantic International Dark Sky Reserve",
        lat: 45.4567,
        lng: -71.1539,
        designation: "Silver",
        country: "Canada",
        sqm: 21.75,
        area_sqkm: 5500,
        established_date: "2007-09-21",
        source: "International Dark-Sky Association"
      },
      {
        name: "Brecon Beacons National Park",
        lat: 51.9500,
        lng: -3.4000,
        designation: "Gold",
        country: "UK",
        sqm: 21.65,
        area_sqkm: 1347,
        established_date: "2013-02-19",
        source: "International Dark-Sky Association"
      }
    ];

    let filteredParks = darkSkyParks;

    if (lat && lng) {
      const targetLat = parseFloat(lat);
      const targetLng = parseFloat(lng);
      const radiusKm = parseFloat(radius);

      filteredParks = darkSkyParks.filter(park => {
        const distance = calculateDistance(targetLat, targetLng, park.lat, park.lng);
        return distance <= radiusKm;
      });
    }

    res.status(200).json({
      count: filteredParks.length,
      parks: filteredParks,
      source: "International Dark-Sky Association (IDA)",
      updated: "2024",
      total_parks_worldwide: 201,
      citation: "International Dark-Sky Association. (2024). Dark Sky Place Program.",
      website: "https://www.darksky.org/our-work/conservation/idsp/"
    });

  } catch (error) {
    console.error('Dark sky parks error:', error);
    res.status(500).json({
      error: 'Failed to fetch dark sky parks',
      message: error.message
    });
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI/180);
}