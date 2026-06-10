const express = require('express');
const db = require('../config/db');
const { verifyToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/leaderboard – top 20 users by ecoScore
// ---------------------------------------------------------------------------
router.get('/', optionalAuth, async (req, res) => {
  try {
    const users = await db.users.find({}).sort({ ecoScore: -1 }).limit(20);

    const leaderboard = users.map((u, index) => ({
      rank: index + 1,
      displayName: u.displayName,
      ecoScore: u.ecoScore,
      totalCO2Saved: u.totalCO2Saved,
      badgeCount: (u.badges || []).length,
    }));

    return res.json({ success: true, data: leaderboard });
  } catch (err) {
    console.error('GET /api/leaderboard error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/leaderboard/rank – current user's rank
// ---------------------------------------------------------------------------
router.get('/rank', verifyToken, async (req, res) => {
  try {
    const user = await db.users.findOne({ _id: req.user._id });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Count users with a higher ecoScore efficiently
    const rank = (await db.users.count({ ecoScore: { $gt: user.ecoScore } })) + 1;

    const totalUsers = await db.users.count({});

    return res.json({
      success: true,
      data: {
        rank,
        totalUsers,
        ecoScore: user.ecoScore,
        displayName: user.displayName,
      },
    });
  } catch (err) {
    console.error('GET /api/leaderboard/rank error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch rank' });
  }
});

module.exports = router;
