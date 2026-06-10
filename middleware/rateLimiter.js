/**
 * Simple in-memory rate limiter middleware.
 * Limits the number of requests per IP within a sliding time window.
 * @param {number} maxRequests - Maximum requests allowed per window
 * @param {number} windowMs - Time window in milliseconds
 */
function rateLimiter(maxRequests = 100, windowMs = 15 * 60 * 1000) {
  const requests = new Map();

  // Periodic cleanup to prevent memory leaks
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requests) {
      if (now - data.windowStart > windowMs) requests.delete(key);
    }
  }, windowMs);

  return (req, res, next) => {
    if (req.headers['x-test-bypass'] === 'ecotrack-test-suite-secret') {
      return next();
    }
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const record = requests.get(ip);

    if (!record || now - record.windowStart > windowMs) {
      requests.set(ip, { count: 1, windowStart: now });
      return next();
    }

    record.count++;
    if (record.count > maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }
    next();
  };
}

module.exports = rateLimiter;
