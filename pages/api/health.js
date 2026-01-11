// pages/api/health.js - Health check API for Next.js
export default function handler(req, res) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      nasa_api: process.env.NASA_API_KEY ? 'configured' : 'not_configured',
      endpoints: [
        'viirs',
        'dark-sky-parks',
        'stations',
        'measurement',
        'sqm-network',
        'chatbot'
      ]
    },
    version: '2.0.0'
  });
}