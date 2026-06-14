exports.notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

exports.errorHandler = (err, req, res, next) => {
  const status = err.statusCode || 500;
  const payload = {
    success: false,
    message: err.message || 'Internal server error'
  };
  if (err.details) payload.details = err.details;
  if (process.env.NODE_ENV !== 'production') payload.stack = err.stack;
  res.status(status).json(payload);
};

