// lib/db.js - Database connection module
const db = require('../config/db');

// Export methods in the format expected by the services
module.exports = {
  any: (query, params) => db.query(query, params).then(result => result.rows),
  one: (query, params) => db.query(query, params).then(result => result.rows[0]),
  oneOrNone: (query, params) => db.query(query, params).then(result => result.rows[0] || null),
  many: (query, params) => db.query(query, params).then(result => result.rows),
  result: (query, params) => db.query(query, params),
  // Direct access to the pool if needed
  pool: db.pool,
  // Query method
  query: (text, params) => db.query(text, params)
};