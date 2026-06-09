const express = require('express');
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return start-of-day Date for today minus `daysAgo` days */
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Return the first moment of the current month */
function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Return the first moment of the previous month */
function startOfLastMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Format a Date as YYYY-MM-DD */
function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// GET /api/dashboard/summary
// ---------------------------------------------------------------------------
router.get('/summary', verifyToken, async (req, res) => {
  try {
    const user = await db.users.findOne({ _id: req.user._id });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const monthStart = startOfMonth();
    const lastMonthStart = startOfLastMonth();

    // Current month activities
    const currentActivities = await db.activities.find({
      userId: req.user._id,
      date: { $gte: monthStart },
    });

    // Last month activities
    const lastMonthActivities = await db.activities.find({
      userId: req.user._id,
      date: { $gte: lastMonthStart, $lt: monthStart },
    });

    const totalCO2 = currentActivities.reduce((sum, a) => sum + a.carbonKg, 0);
    const dayOfMonth = new Date().getDate();
    const dailyAvg = dayOfMonth > 0 ? totalCO2 / dayOfMonth : 0;
    const activitiesCount = currentActivities.length;

    const lastMonthTotal = lastMonthActivities.reduce((sum, a) => sum + a.carbonKg, 0);
    const comparedToLastMonth =
      lastMonthTotal > 0
        ? parseFloat((((totalCO2 - lastMonthTotal) / lastMonthTotal) * 100).toFixed(1))
        : 0;

    return res.json({
      success: true,
      data: {
        totalCO2: parseFloat(totalCO2.toFixed(2)),
        dailyAvg: parseFloat(dailyAvg.toFixed(2)),
        ecoScore: user.ecoScore,
        currentStreak: user.currentStreak,
        monthlyGoal: user.monthlyGoal,
        activitiesCount,
        comparedToLastMonth,
      },
    });
  } catch (err) {
    console.error('GET /api/dashboard/summary error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch summary' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/dashboard/category-breakdown
// ---------------------------------------------------------------------------
router.get('/category-breakdown', verifyToken, async (req, res) => {
  try {
    const monthStart = startOfMonth();

    const activities = await db.activities.find({
      userId: req.user._id,
      date: { $gte: monthStart },
    });

    const totalCO2 = activities.reduce((sum, a) => sum + a.carbonKg, 0);

    // Group by category
    const grouped = activities.reduce((acc, a) => {
      if (!acc[a.category]) {
        acc[a.category] = { totalCO2: 0, count: 0 };
      }
      acc[a.category].totalCO2 += a.carbonKg;
      acc[a.category].count += 1;
      return acc;
    }, {});

    const breakdown = Object.entries(grouped).map(([category, data]) => ({
      category,
      totalCO2: parseFloat(data.totalCO2.toFixed(2)),
      percentage: totalCO2 > 0 ? parseFloat(((data.totalCO2 / totalCO2) * 100).toFixed(1)) : 0,
      count: data.count,
    }));

    // Sort by totalCO2 descending
    breakdown.sort((a, b) => b.totalCO2 - a.totalCO2);

    return res.json({ success: true, data: breakdown });
  } catch (err) {
    console.error('GET /api/dashboard/category-breakdown error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch category breakdown' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/dashboard/weekly-trend
// ---------------------------------------------------------------------------
router.get('/weekly-trend', verifyToken, async (req, res) => {
  try {
    const sevenDaysAgo = daysAgo(6); // 7 days including today

    const activities = await db.activities.find({
      userId: req.user._id,
      date: { $gte: sevenDaysAgo },
    });

    // Group by date string
    const byDate = activities.reduce((acc, a) => {
      const key = formatDate(new Date(a.date));
      acc[key] = (acc[key] || 0) + a.carbonKg;
      return acc;
    }, {});

    // Fill all 7 days
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = daysAgo(i);
      const key = formatDate(d);
      trend.push({
        date: key,
        totalCO2: parseFloat((byDate[key] || 0).toFixed(2)),
      });
    }

    return res.json({ success: true, data: trend });
  } catch (err) {
    console.error('GET /api/dashboard/weekly-trend error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch weekly trend' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/dashboard/monthly-trend
// ---------------------------------------------------------------------------
router.get('/monthly-trend', verifyToken, async (req, res) => {
  try {
    const thirtyDaysAgo = daysAgo(29); // 30 days including today

    const activities = await db.activities.find({
      userId: req.user._id,
      date: { $gte: thirtyDaysAgo },
    });

    // Group by date string
    const byDate = activities.reduce((acc, a) => {
      const key = formatDate(new Date(a.date));
      acc[key] = (acc[key] || 0) + a.carbonKg;
      return acc;
    }, {});

    // Fill all 30 days
    const trend = [];
    for (let i = 29; i >= 0; i--) {
      const d = daysAgo(i);
      const key = formatDate(d);
      trend.push({
        date: key,
        totalCO2: parseFloat((byDate[key] || 0).toFixed(2)),
      });
    }

    return res.json({ success: true, data: trend });
  } catch (err) {
    console.error('GET /api/dashboard/monthly-trend error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch monthly trend' });
  }
});

module.exports = router;
