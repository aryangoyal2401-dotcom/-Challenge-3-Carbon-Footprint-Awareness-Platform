const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { verifyToken, generateToken } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// Helper – strip password from user doc before returning
// ---------------------------------------------------------------------------
function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and displayName are required',
      });
    }

    // Server-side password strength validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long',
      });
    }

    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({
        success: false,
        error: 'Password must contain both letters and numbers',
      });
    }

    // Check if email already exists
    const existing = await db.users.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.users.insert({
      email: email.toLowerCase(),
      password: hashedPassword,
      displayName,
      photoURL: '',
      profile: {
        householdSize: 1,
        region: 'global',
        dietType: 'mixed',
        primaryTransport: 'car_gasoline',
      },
      ecoScore: 50,
      totalCO2Saved: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      monthlyGoal: 500,
      badges: [],
      createdAt: new Date(),
    });

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      data: { token, user: sanitizeUser(newUser) },
    });
  } catch (err) {
    console.error('POST /api/auth/register error:', err);
    // Handle unique constraint violation from nedb
    if (err.errorType === 'uniqueViolated') {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }
    return res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    const user = await db.users.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      data: { token, user: sanitizeUser(user) },
    });
  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    return res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/profile
// ---------------------------------------------------------------------------
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await db.users.findOne({ _id: req.user._id });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    return res.json({ success: true, data: sanitizeUser(user) });
  } catch (err) {
    console.error('GET /api/auth/profile error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/auth/profile
// ---------------------------------------------------------------------------
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { householdSize, region, dietType, primaryTransport, monthlyGoal } = req.body;

    const updateFields = {};
    if (householdSize !== undefined) updateFields['profile.householdSize'] = householdSize;
    if (region !== undefined) updateFields['profile.region'] = region;
    if (dietType !== undefined) updateFields['profile.dietType'] = dietType;
    if (primaryTransport !== undefined) updateFields['profile.primaryTransport'] = primaryTransport;
    if (monthlyGoal !== undefined) updateFields.monthlyGoal = monthlyGoal;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    await db.users.update({ _id: req.user._id }, { $set: updateFields });
    const updatedUser = await db.users.findOne({ _id: req.user._id });

    return res.json({ success: true, data: sanitizeUser(updatedUser) });
  } catch (err) {
    console.error('PUT /api/auth/profile error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/sync – backward-compat: return current user profile
// ---------------------------------------------------------------------------
router.post('/sync', verifyToken, async (req, res) => {
  try {
    const user = await db.users.findOne({ _id: req.user._id });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    return res.json({ success: true, data: sanitizeUser(user) });
  } catch (err) {
    console.error('POST /api/auth/sync error:', err);
    return res.status(500).json({ success: false, error: 'Sync failed' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/auth/account
// ---------------------------------------------------------------------------
router.delete('/account', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    await db.activities.remove({ userId }, { multi: true });
    await db.challenges.remove({ userId }, { multi: true });
    await db.users.remove({ _id: userId });
    return res.json({ success: true, data: { message: 'Account deleted' } });
  } catch (err) {
    console.error('DELETE /api/auth/account error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
});

module.exports = router;
