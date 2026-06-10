/**
 * Input sanitization middleware.
 * Strips HTML tags from strings (XSS prevention) and removes NoSQL injection operators
 * (keys starting with '$' or containing '.') recursively across body, query, and params.
 */

function cleanNoSQL(obj) {
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        cleanNoSQL(obj[key]);
      }
    }
  }
}

function cleanXSS(obj) {
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key]
          .replace(/<[^>]*>/g, '') // strip HTML tags
          .replace(/javascript:/gi, '') // strip malicious schemes
          .trim();
      } else if (typeof obj[key] === 'object') {
        cleanXSS(obj[key]);
      }
    }
  }
}

function sanitize(req, _res, next) {
  // 1. Prevent NoSQL Injection
  if (req.body) cleanNoSQL(req.body);
  if (req.query) cleanNoSQL(req.query);
  if (req.params) cleanNoSQL(req.params);

  // 2. Prevent XSS Attacks
  if (req.body) cleanXSS(req.body);
  if (req.query) cleanXSS(req.query);

  next();
}

module.exports = sanitize;
