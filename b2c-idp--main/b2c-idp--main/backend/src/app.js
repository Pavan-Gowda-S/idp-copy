const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/error.middleware');

const app = express();
const corsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (env.clientOrigins.includes('*')) return callback(null, true);
    if (!origin && env.clientOrigins.includes(null)) return callback(null, true);
    if (env.clientOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  }
};

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 500 }));

// All user files are stored in Supabase Storage. Keep the backend stateless.
app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', service: 'b2c-backend' });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;

