const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ecotrack-secret-key-change-in-production';

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  try {
    const token = authHeader.split('Bearer ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split('Bearer ')[1];
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      req.user = null;
    }
  }
  next();
}

function generateToken(user) {
  return jwt.sign(
    { _id: user._id, email: user.email, displayName: user.displayName },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyAdmin(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user && req.user.email === 'admin@ecotrack.com') {
      next();
    } else {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
  });
}

module.exports = { verifyToken, optionalAuth, generateToken, verifyAdmin, JWT_SECRET };
