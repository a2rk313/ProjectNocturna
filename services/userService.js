// services/userService.js - User management service
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, logger } = require('../config/db');
const config = require('../config/app');

class UserService {
  static async findByEmail(email) {
    try {
      const result = await query(
        'SELECT id, email, password_hash, first_name, last_name, role, created_at, is_active FROM users WHERE email = $1 AND is_active = true',
        [email]
      );
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const result = await query(
        'SELECT id, email, first_name, last_name, role, created_at, is_active FROM users WHERE id = $1 AND is_active = true',
        [id]
      );
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error finding user by id:', error);
      throw error;
    }
  }

  static async create(userData) {
    try {
      const { email, password, firstName, lastName, role = 'user' } = userData;
      
      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      const result = await query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, created_at, is_active)
         VALUES ($1, $2, $3, $4, $5, NOW(), true)
         RETURNING id, email, first_name, last_name, role, created_at`,
        [email, passwordHash, firstName, lastName, role]
      );
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  static async generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });
  }

  static async validatePassword(inputPassword, storedHash) {
    try {
      return await bcrypt.compare(inputPassword, storedHash);
    } catch (error) {
      logger.error('Error validating password:', error);
      throw error;
    }
  }
}

module.exports = UserService;