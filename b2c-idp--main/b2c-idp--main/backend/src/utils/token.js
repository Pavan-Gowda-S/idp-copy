const jwt = require('jsonwebtoken');
const env = require('../config/env');

exports.signToken = (payload) => jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

