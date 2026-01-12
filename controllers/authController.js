// controllers/authController.js - Authentication controller
const UserService = require('../services/userService');
const { logger } = require('../config/db');

class AuthController {
  static async register(req, res) {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Check if user already exists
      const existingUser = await UserService.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      // Create new user
      const user = await UserService.create({
        email,
        password,
        firstName,
        lastName
      });

      // Generate token
      const token = await UserService.generateToken(user);

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        token
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed', details: error.message });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await UserService.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Validate password
      const isValidPassword = await UserService.validatePassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
      await require('../config/db').query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [user.id]
      );

      // Generate token
      const token = await UserService.generateToken(user);

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        token
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({ error: 'Login failed', details: error.message });
    }
  }

  static async getProfile(req, res) {
    try {
      const user = await UserService.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          createdAt: user.created_at
        }
      });
    } catch (error) {
      logger.error('Profile fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch profile', details: error.message });
    }
  }

  static async updateProfile(req, res) {
    try {
      const { firstName, lastName } = req.body;
      const userId = req.user.id;

      const result = await require('../config/db').query(
        `UPDATE users 
         SET first_name = $1, last_name = $2, updated_at = NOW() 
         WHERE id = $3 
         RETURNING id, email, first_name, last_name, role, created_at`,
        [firstName, lastName, userId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        message: 'Profile updated successfully',
        user: result.rows[0]
      });
    } catch (error) {
      logger.error('Profile update error:', error);
      res.status(500).json({ error: 'Failed to update profile', details: error.message });
    }
  }
}

module.exports = AuthController;