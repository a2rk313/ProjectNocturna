// utils/data-utils.js - Utility functions for data processing

/**
 * Calculate standard deviation of an array of numbers
 * @param {number[]} values - Array of numeric values
 * @returns {number} Standard deviation
 */
function calculateStdDev(values) {
  if (!values || values.length === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
  const avgSquaredDifference = squaredDifferences.reduce((sum, val) => sum + val, 0) / values.length;
  
  return Math.sqrt(avgSquaredDifference);
}

/**
 * Generate sample VIIRS data for fallback scenarios
 * @param {string} bbox - Bounding box coordinates as comma-separated string
 * @returns {Array} Array of sample VIIRS data points
 */
function generateSampleVIIRSData(bbox) {
  const points = [];
  const count = 50; // Default number of sample points
  
  // Parse bounding box if provided
  let minLat = 35, maxLat = 45, minLon = -120, maxLon = -100;
  
  if (bbox) {
    try {
      const coords = bbox.split(',').map(Number);
      if (coords.length === 4) {
        [minLon, minLat, maxLon, maxLat] = coords;
      }
    } catch (e) {
      console.warn('Invalid bbox format, using default coordinates');
    }
  }
  
  // Generate random sample points within the bounding box
  for (let i = 0; i < count; i++) {
    const lat = minLat + Math.random() * (maxLat - minLat);
    const lon = minLon + Math.random() * (maxLon - minLon);
    const brightness = 5 + Math.random() * 40; // Random brightness between 5-45
    const frp = Math.random() * 100; // Random FRP value
    const confidence = Math.random() > 0.5 ? 'high' : 'low';
    const date = new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    points.push({
      lat: parseFloat(lat.toFixed(4)),
      lng: parseFloat(lon.toFixed(4)),
      brightness: parseFloat(brightness.toFixed(2)),
      frp: parseFloat(frp.toFixed(2)),
      confidence,
      date
    });
  }
  
  return points;
}

/**
 * Validate geographic coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean} True if coordinates are valid
 */
function validateCoordinates(lat, lng) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
}

/**
 * Format coordinates for API requests
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} precision - Decimal precision
 * @returns {Object} Formatted coordinates object
 */
function formatCoordinates(lat, lng, precision = 6) {
  if (!validateCoordinates(lat, lng)) {
    throw new Error('Invalid coordinates');
  }
  
  return {
    lat: Number(lat.toFixed(precision)),
    lng: Number(lng.toFixed(precision))
  };
}

module.exports = {
  calculateStdDev,
  generateSampleVIIRSData,
  validateCoordinates,
  formatCoordinates
};