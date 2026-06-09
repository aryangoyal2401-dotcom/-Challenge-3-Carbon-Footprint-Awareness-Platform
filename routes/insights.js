const express = require('express');
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const {
  generateInsights,
  getComparisonData,
  calculateEquivalencies,
} = require('../utils/insightEngine');

const router = express.Router();

// ---------------------------------------------------------------------------
// Helper – activities from the last N days
// ---------------------------------------------------------------------------
async function recentActivities(userId, days) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  return db.activities.find({
    userId,
    date: { $gte: since },
  });
}

// ---------------------------------------------------------------------------
// Helper – current month total CO₂
// ---------------------------------------------------------------------------
async function currentMonthTotal(userId) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const activities = await db.activities.find({
    userId,
    date: { $gte: monthStart },
  });

  return activities.reduce((sum, a) => sum + a.carbonKg, 0);
}

// ---------------------------------------------------------------------------
// GET /api/insights – personalized insights
// ---------------------------------------------------------------------------
router.get('/', verifyToken, async (req, res) => {
  try {
    const activities = await recentActivities(req.user._id, 30);
    const user = await db.users.findOne({ _id: req.user._id });

    const insights = generateInsights(activities, user);

    return res.json({ success: true, data: insights });
  } catch (err) {
    console.error('GET /api/insights error:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate insights' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/insights/comparison – national / global comparison
// ---------------------------------------------------------------------------
router.get('/comparison', verifyToken, async (req, res) => {
  try {
    const totalCO2 = await currentMonthTotal(req.user._id);
    const user = await db.users.findOne({ _id: req.user._id });
    const region = user?.profile?.region || 'global';

    const comparison = getComparisonData(totalCO2, region);

    return res.json({ success: true, data: comparison });
  } catch (err) {
    console.error('GET /api/insights/comparison error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch comparison data' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/insights/equivalencies – fun equivalency stats
// ---------------------------------------------------------------------------
router.get('/equivalencies', verifyToken, async (req, res) => {
  try {
    const totalCO2 = await currentMonthTotal(req.user._id);
    const equivalencies = calculateEquivalencies(totalCO2);

    return res.json({ success: true, data: equivalencies });
  } catch (err) {
    console.error('GET /api/insights/equivalencies error:', err);
    return res.status(500).json({ success: false, error: 'Failed to calculate equivalencies' });
  }
});

module.exports = router;
