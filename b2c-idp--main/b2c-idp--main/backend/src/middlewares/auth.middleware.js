const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const store = require('../services/supabase.service');
const collections = require('../supabase/tables');

exports.authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new AppError('Authentication token required', 401);

    const decoded = jwt.verify(token, env.jwtSecret);
    const role = String(decoded.role || '').toLowerCase();
    const collection = role === 'builder' ? collections.builders : collections.customers;
    const user = await store.getById(collection, decoded.id);

    if (!user) throw new AppError('Authenticated user no longer exists', 401);

    req.user = user;
    req.userRole = role;
    req.authUserId = decoded.userId || null;
    req.tokenProjects = decoded.projects || [];
    next();
  } catch (error) {
    next(error.statusCode ? error : new AppError('Invalid or expired token', 401));
  }
};

exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.userRole)) return next(new AppError('Insufficient permissions', 403));
  next();
};
