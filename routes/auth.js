const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db');
const { verifyToken, generateToken, JWT_SECRET } = require('../middleware/auth');
const { NATIONAL_AVERAGES } = require('../utils/emissionFactors');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/auth/captcha (no auth required)
// Generates a math puzzle and returns a signed token containing the answer and timestamp
// ---------------------------------------------------------------------------
router.get('/captcha', (req, res) => {
  const ops = ['+', '-', '*'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a, b, answer;
  switch (op) {
    case '+':
      a = Math.floor(Math.random() * 20) + 1;
      b = Math.floor(Math.random() * 20) + 1;
      answer = a + b;
      break;
    case '-':
      a = Math.floor(Math.random() * 20) + 5;
      b = Math.floor(Math.random() * a);
      answer = a - b;
      break;
    case '*':
      a = Math.floor(Math.random() * 10) + 1;
      b = Math.floor(Math.random() * 10) + 1;
      answer = a * b;
      break;
  }

  const timestamp = Date.now();
  const rawData = `${answer}.${timestamp}`;
  const hash = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(rawData)
    .digest('hex');
  const token = `${timestamp}.${hash}`;

  const displayOp = op === '*' ? '×' : op;

  return res.json({
    success: true,
    data: {
      question: `What is ${a} ${displayOp} ${b}?`,
      token
    }
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/verify-captcha (no auth required)
// Lightweight verification helper for frontend feedback
// ---------------------------------------------------------------------------
router.post('/verify-captcha', (req, res) => {
  const { captchaAnswer, captchaToken } = req.body;
  if (!captchaToken || captchaAnswer === undefined) {
    return res.status(400).json({ success: false, error: 'CAPTCHA answer and token are required' });
  }

  try {
    const [timestamp, hash] = captchaToken.split('.');
    if (!timestamp || !hash) {
      return res.status(400).json({ success: false, error: 'Invalid CAPTCHA token format' });
    }

    if (Date.now() - parseInt(timestamp, 10) > 5 * 60 * 1000) {
      return res.status(400).json({ success: false, error: 'CAPTCHA has expired' });
    }

    const rawData = `${captchaAnswer}.${timestamp}`;
    const expectedHash = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(rawData)
      .digest('hex');

    if (expectedHash !== hash) {
      return res.status(400).json({ success: false, error: 'Incorrect answer' });
    }

    return res.json({ success: true, data: { verified: true } });
  } catch {
    return res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

// ---------------------------------------------------------------------------
// Helper – strip password from user doc before returning
// ---------------------------------------------------------------------------
function sanitizeUser(user) {
  if (!user) return null;
  const { password: _password, ...safe } = user;
  return safe;
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName, captchaAnswer, captchaToken } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and displayName are required',
      });
    }

    // Server-side CAPTCHA verification
    if (!captchaToken || captchaAnswer === undefined) {
      return res.status(400).json({ success: false, error: 'CAPTCHA verification is required' });
    }

    try {
      const [timestamp, hash] = captchaToken.split('.');
      if (!timestamp || !hash) {
        return res.status(400).json({ success: false, error: 'Invalid CAPTCHA token format' });
      }

      if (Date.now() - parseInt(timestamp, 10) > 5 * 60 * 1000) {
        return res.status(400).json({ success: false, error: 'CAPTCHA has expired. Please try again.' });
      }

      const rawData = `${captchaAnswer}.${timestamp}`;
      const expectedHash = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(rawData)
        .digest('hex');

      if (expectedHash !== hash) {
        return res.status(400).json({ success: false, error: 'Incorrect CAPTCHA answer' });
      }
    } catch {
      return res.status(400).json({ success: false, error: 'CAPTCHA verification failed' });
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
    if (householdSize !== undefined) {
      const size = parseInt(householdSize, 10);
      if (isNaN(size) || size < 1) {
        return res.status(400).json({ success: false, error: 'Household size must be a positive integer' });
      }
      updateFields['profile.householdSize'] = size;
    }
    if (region !== undefined) {
      const validRegions = Object.keys(NATIONAL_AVERAGES);
      if (!validRegions.includes(region)) {
        return res.status(400).json({ success: false, error: 'Invalid region option' });
      }
      updateFields['profile.region'] = region;
    }
    if (dietType !== undefined) {
      const validDiets = ['omnivore', 'pescatarian', 'vegetarian', 'vegan', 'mixed', 'heavy-meat'];
      if (!validDiets.includes(dietType)) {
        return res.status(400).json({ success: false, error: 'Invalid diet type option' });
      }
      updateFields['profile.dietType'] = dietType;
    }
    if (primaryTransport !== undefined) {
      const validTransports = ['car', 'public_transit', 'bicycle', 'walking', 'electric_vehicle', 'car_gasoline'];
      if (!validTransports.includes(primaryTransport)) {
        return res.status(400).json({ success: false, error: 'Invalid primary transport option' });
      }
      updateFields['profile.primaryTransport'] = primaryTransport;
    }
    if (monthlyGoal !== undefined) {
      const goal = parseFloat(monthlyGoal);
      if (isNaN(goal) || goal < 1) {
        return res.status(400).json({ success: false, error: 'Monthly goal must be a positive number' });
      }
      updateFields.monthlyGoal = goal;
    }

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
      { $set: { resetCode, resetExpiry: resetExpiry.toISOString(), resetAttempts: 0 } }
    );

    console.log(`\n🔑 PASSWORD RESET CODE for ${user.email}: ${resetCode} (expires in 15 min)\n`);

    return res.json({
      success: true,
      data: {
        message: 'If an account with that email exists, a password reset code has been sent to the server administrator.'
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
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid reset code' });
    }

    if (!user.resetCode) {
      return res.status(400).json({ success: false, error: 'No active password reset request' });
    }

    if (new Date() > new Date(user.resetExpiry)) {
      await db.users.update(
        { _id: user._id },
        { $unset: { resetCode: true, resetExpiry: true, resetAttempts: true } }
      );
      return res.status(400).json({ success: false, error: 'Reset code has expired. Please request a new one.' });
    }

    if (user.resetCode !== resetCode) {
      const attempts = (user.resetAttempts || 0) + 1;
      if (attempts >= 3) {
        // Invalidate reset code
        await db.users.update(
          { _id: user._id },
          { $unset: { resetCode: true, resetExpiry: true, resetAttempts: true } }
        );
        return res.status(400).json({ success: false, error: 'Invalid reset code. Too many failed attempts. Please request a new one.' });
      } else {
        await db.users.update(
          { _id: user._id },
          { $set: { resetAttempts: attempts } }
        );
        return res.status(400).json({ success: false, error: `Invalid reset code. You have ${3 - attempts} attempts remaining.` });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.users.update(
      { _id: user._id },
      { $set: { password: hashedPassword }, $unset: { resetCode: true, resetExpiry: true, resetAttempts: true } }
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
