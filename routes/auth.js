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
// PUT /api/auth/change-password
// ---------------------------------------------------------------------------
router.put('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current and new passwords are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
    }

    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ success: false, error: 'Password must contain both letters and numbers' });
    }

    const user = await db.users.findOne({ _id: req.user._id });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.users.update({ _id: req.user._id }, { $set: { password: hashedPassword } });

    return res.json({ success: true, data: { message: 'Password changed successfully' } });
  } catch (err) {
    console.error('PUT /api/auth/change-password error:', err);
    return res.status(500).json({ success: false, error: 'Failed to change password' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/auth/change-name
// ---------------------------------------------------------------------------
router.put('/change-name', verifyToken, async (req, res) => {
  try {
    const { displayName } = req.body;

    if (!displayName || !displayName.trim()) {
      return res.status(400).json({ success: false, error: 'Display name is required' });
    }

    await db.users.update({ _id: req.user._id }, { $set: { displayName: displayName.trim() } });
    const updatedUser = await db.users.findOne({ _id: req.user._id });

    return res.json({ success: true, data: sanitizeUser(updatedUser) });
  } catch (err) {
    console.error('PUT /api/auth/change-name error:', err);
    return res.status(500).json({ success: false, error: 'Failed to change name' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/forgot-password  (no auth required)
// Generates a temporary reset token, stores it, and returns it.
// In production you would email this; for local demo we return it directly.
// ---------------------------------------------------------------------------
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const user = await db.users.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal whether the email exists — return generic success
      return res.json({
        success: true,
        data: { message: 'If an account with that email exists, a reset token has been generated.' }
      });
    }

    // Generate a 6-digit reset code
    const resetCode = String(Math.floor(100000 + Math.random() * 900000));
    const resetExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await db.users.update(
      { _id: user._id },
      { $set: { resetCode, resetExpiry: resetExpiry.toISOString() } }
    );

    console.log(`\n🔑 PASSWORD RESET CODE for ${user.email}: ${resetCode} (expires in 15 min)\n`);

    return res.json({
      success: true,
      data: {
        message: 'If an account with that email exists, a reset code has been generated. Check the server console for demo purposes.',
        // For the hackathon demo, we return the code directly so the UI can show it
        resetCode
      }
    });
  } catch (err) {
    console.error('POST /api/auth/forgot-password error:', err);
    return res.status(500).json({ success: false, error: 'Failed to process request' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/reset-password  (no auth required)
// ---------------------------------------------------------------------------
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetCode, newPassword } = req.body;

    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({ success: false, error: 'Email, reset code, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
    }

    const user = await db.users.findOne({ email: email.toLowerCase() });
    if (!user || user.resetCode !== resetCode) {
      return res.status(400).json({ success: false, error: 'Invalid reset code' });
    }

    if (new Date() > new Date(user.resetExpiry)) {
      return res.status(400).json({ success: false, error: 'Reset code has expired. Please request a new one.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.users.update(
      { _id: user._id },
      { $set: { password: hashedPassword }, $unset: { resetCode: true, resetExpiry: true } }
    );

    return res.json({ success: true, data: { message: 'Password has been reset successfully. You can now sign in.' } });
  } catch (err) {
    console.error('POST /api/auth/reset-password error:', err);
    return res.status(500).json({ success: false, error: 'Failed to reset password' });
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
