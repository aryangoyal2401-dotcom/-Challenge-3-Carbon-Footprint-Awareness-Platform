const express = require('express');
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const { getEmissionFactor } = require('../utils/emissionFactors');
const { calculateEcoScore } = require('../utils/insightEngine');

const router = express.Router();

// ---------------------------------------------------------------------------
// Helper – Update user's ecoScore and totalCO2Saved
// ---------------------------------------------------------------------------
async function updateUserEcoMetrics(userId) {
  try {
    const user = await db.users.findOne({ _id: userId });
    if (!user) return;

    // Fetch all user activities
    const activities = await db.activities.find({ userId });

    // 1. Calculate total CO2 saved based on eco-friendly choices
    let totalCO2Saved = 0;
    for (const act of activities) {
      if (act.category === 'food') {
        if (act.subCategory === 'vegan_meal') totalCO2Saved += act.value * (7.0 - 0.3);
        else if (act.subCategory === 'vegetarian_meal') totalCO2Saved += act.value * (7.0 - 0.5);
        else if (act.subCategory === 'chicken_meal') totalCO2Saved += act.value * (7.0 - 1.5);
        else if (act.subCategory === 'fish_meal') totalCO2Saved += act.value * (7.0 - 1.2);
      } else if (act.category === 'transportation') {
        if (act.subCategory === 'bicycle' || act.subCategory === 'walking') {
          totalCO2Saved += act.value * 0.21;
        } else if (act.subCategory === 'car_electric') {
          totalCO2Saved += act.value * (0.21 - 0.05);
        } else if (act.subCategory === 'bus' || act.subCategory === 'train' || act.subCategory === 'subway') {
          totalCO2Saved += act.value * (0.21 - 0.05); // compared to gasoline car
        }
      } else if (act.category === 'energy') {
        if (act.subCategory === 'solar' || act.subCategory === 'wind') {
          totalCO2Saved += act.value * 0.45;
        }
      } else if (act.category === 'shopping') {
        if (act.subCategory === 'clothing_sustainable') {
          totalCO2Saved += act.value * 0.02; // fast fashion (0.04) - sustainable (0.02)
        }
      }
    }

    // 2. Calculate current month activities ecoScore
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthActivities = activities.filter(act => new Date(act.date) >= monthStart);
    
    const ecoScore = calculateEcoScore(currentMonthActivities, user.monthlyGoal || 500);

    // Update user document
    await db.users.update(
      { _id: userId },
      { $set: { ecoScore, totalCO2Saved: parseFloat(totalCO2Saved.toFixed(2)) } }
    );
  } catch (err) {
    console.error('Error updating user eco metrics:', err);
  }
}

// ---------------------------------------------------------------------------
// Unit lookup by category
// ---------------------------------------------------------------------------
function unitForCategory(category) {
  const map = {
    transportation: 'km',
    food: 'meals',
    energy: 'kWh',
    shopping: '$',
  };
  return map[category] || 'unit';
}

// ---------------------------------------------------------------------------
// Helper – check if two dates are the same calendar day
// ---------------------------------------------------------------------------
function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isYesterday(d1, today) {
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(d1, yesterday);
}

// ---------------------------------------------------------------------------
// POST /api/activities – create activity
// ---------------------------------------------------------------------------
router.post('/', verifyToken, async (req, res) => {
  try {
    const { category, subCategory, value, date, notes } = req.body;

    if (!category || !subCategory || value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'category, subCategory, and value are required',
      });
    }

    const factor = getEmissionFactor(category, subCategory);
    if (factor === null) {
      return res.status(400).json({
        success: false,
        error: `Unknown emission factor for ${category}/${subCategory}`,
      });
    }

    const carbonKg = parseFloat((value * factor).toFixed(4));
    const unit = unitForCategory(category);

    const activity = await db.activities.insert({
      userId: req.user._id,
      category,
      subCategory,
      value: parseFloat(value),
      unit,
      carbonKg,
      date: new Date(date || Date.now()),
      notes: notes || '',
      createdAt: new Date(),
    });

    // --- Update user streak ---
    const user = await db.users.findOne({ _id: req.user._id });
    if (user) {
      const today = new Date();
      let { currentStreak, longestStreak, lastActiveDate } = user;

      if (lastActiveDate) {
        const lastActive = new Date(lastActiveDate);
        if (isSameDay(lastActive, today)) {
          // Same day – keep streak
        } else if (isYesterday(lastActive, today)) {
          currentStreak += 1;
        } else {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }

      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }

      await db.users.update(
        { _id: req.user._id },
        {
          $set: {
            currentStreak,
            longestStreak,
            lastActiveDate: today,
          },
        }
      );
    }

    await updateUserEcoMetrics(req.user._id);

    return res.status(201).json({ success: true, data: activity });
  } catch (err) {
    console.error('POST /api/activities error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create activity' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/activities – list activities with optional filters
// ---------------------------------------------------------------------------
router.get('/', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate, category, limit, skip } = req.query;

    const query = { userId: req.user._id };

    // Date filters
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (category) {
      query.category = category;
    }

    const limitNum = parseInt(limit, 10) || 50;
    const skipNum = parseInt(skip, 10) || 0;

    const activities = await db.activities
      .find(query)
      .sort({ date: -1 })
      .limit(limitNum)
      .skip(skipNum);

    return res.json({ success: true, data: activities });
  } catch (err) {
    console.error('GET /api/activities error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch activities' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/activities/:id – single activity
// ---------------------------------------------------------------------------
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const activity = await db.activities.findOne({ _id: req.params.id });
    if (!activity) {
      return res.status(404).json({ success: false, error: 'Activity not found' });
    }
    if (activity.userId !== req.user._id) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    return res.json({ success: true, data: activity });
  } catch (err) {
    console.error('GET /api/activities/:id error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch activity' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/activities/:id – delete activity
// ---------------------------------------------------------------------------
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const activity = await db.activities.findOne({ _id: req.params.id });
    if (!activity) {
      return res.status(404).json({ success: false, error: 'Activity not found' });
    }
    if (activity.userId !== req.user._id) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    await db.activities.remove({ _id: req.params.id });

    await updateUserEcoMetrics(req.user._id);

    return res.json({ success: true, data: { message: 'Activity deleted' } });
  } catch (err) {
    console.error('DELETE /api/activities/:id error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete activity' });
  }
});

module.exports = router;
