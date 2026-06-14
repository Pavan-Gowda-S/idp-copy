const multer = require('multer');
const env = require('../config/env');
const AppError = require('../utils/AppError');

const allowed = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
]);

const fileFilter = (req, file, cb) => {
  if (!allowed.has(file.mimetype)) return cb(new AppError('Only JPG, PNG, WEBP, and PDF files are allowed', 400));
  cb(null, true);
};

module.exports = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: env.maxFileSizeMb * 1024 * 1024 }
});

