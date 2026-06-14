const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const splitOrigins = (value) => String(value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)
  .map((origin) => (origin === 'null' ? null : origin));

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB || 10),
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  clientOrigins: splitOrigins(process.env.CLIENT_ORIGIN || '*'),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'construction-uploads'
};

