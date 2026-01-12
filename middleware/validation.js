// middleware/validation.js - Input validation middleware
const { validationResult } = require('express-validator');

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  };
};

// Common validation schemas
const validators = {
  // User registration validation
  register: [
    require('express-validator').body('email').isEmail().normalizeEmail(),
    require('express-validator').body('password').isLength({ min: 8 }),
    require('express-validator').body('firstName').trim().escape(),
    require('express-validator').body('lastName').trim().escape()
  ],
  
  // Login validation
  login: [
    require('express-validator').body('email').isEmail().normalizeEmail(),
    require('express-validator').body('password').exists()
  ],
  
  // Measurement validation
  measurement: [
    require('express-validator').body('sqmReading').isFloat({ min: 0, max: 25 }),
    require('express-validator').body('location').isObject(),
    require('express-validator').body('location.latitude').isFloat({ min: -90, max: 90 }),
    require('express-validator').body('location.longitude').isFloat({ min: -180, max: 180 }),
    require('express-validator').body('bortleClass').optional().isInt({ min: 1, max: 9 })
  ],
  
  // Bounding box validation
  bbox: [
    require('express-validator').query('bbox').optional().custom(value => {
      if (!value) return true;
      const coords = value.split(',').map(Number);
      if (coords.length !== 4) {
        throw new Error('Bounding box must contain exactly 4 coordinates (minLon,minLat,maxLon,maxLat)');
      }
      const [minLon, minLat, maxLon, maxLat] = coords;
      if (isNaN(minLon) || isNaN(minLat) || isNaN(maxLon) || isNaN(maxLat)) {
        throw new Error('All bounding box coordinates must be valid numbers');
      }
      if (minLon < -180 || minLon > 180 || maxLon < -180 || maxLon > 180) {
        throw new Error('Longitude values must be between -180 and 180');
      }
      if (minLat < -90 || minLat > 90 || maxLat < -90 || maxLat > 90) {
        throw new Error('Latitude values must be between -90 and 90');
      }
      if (minLat >= maxLat || minLon >= maxLon) {
        throw new Error('Invalid bounding box: minimum coordinates must be less than maximum');
      }
      return true;
    })
  ],
  
  // Year validation
  year: [
    require('express-validator').param('year').isInt({ min: 1900, max: new Date().getFullYear() + 1 })
  ],
  
  // Month validation
  month: [
    require('express-validator').param('month').isInt({ min: 1, max: 12 })
  ]
};

module.exports = {
  validate,
  validators
};