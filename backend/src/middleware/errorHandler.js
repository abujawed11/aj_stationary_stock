const ApiError = require("../utils/ApiError");

function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? "Internal server error" : err.message;
  const errors = err.errors || [];

  if (statusCode === 500) {
    console.error(err);
  }

  res.status(statusCode).json({ success: false, message, errors });
}

module.exports = { notFoundHandler, errorHandler };
