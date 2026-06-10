/**
 * Input sanitization middleware.
 * Strips HTML tags and trims whitespace from all string fields in req.body
 * to prevent XSS (Cross-Site Scripting) attacks.
 */
function sanitize(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key]
          .replace(/<[^>]*>/g, '')
          .trim();
      }
    }
  }
  next();
}

module.exports = sanitize;
