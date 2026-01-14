// routes/auth.js - Authentication routes
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { validate, validators } = require('../middleware/validation');
const { optionalAuth } = require('../middleware/auth');

// Public routes
router.post('/register', validate(validators.register), AuthController.register);
router.post('/login', validate(validators.login), AuthController.login);

// Protected routes
router.get('/profile', optionalAuth, AuthController.getProfile);
router.put('/profile', optionalAuth, AuthController.updateProfile);

module.exports = router;