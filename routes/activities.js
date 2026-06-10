const express = require('express');
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const { getEmissionFactor } = require('../utils/emissionFactors');
const { calculateEcoScore } = require('../utils/insightEngine');
const { checkAndAwardBadges } = require('../utils/badgeEngine');

const router = express.Router();

// ---------------------------------------------------------------------------
// Carbon saved calculator
// ---------------------------------------------------------------------------
function calculateCarbonSaved(category, subCategory, value) {
  let saved = 0;
  const val = parseFloat(value);
  if (isNaN(val) || val <= 0) return 0;
  if (category === 'food') {
    if (subCategory === 'vegan_meal') saved = val * (7.0 - 0.3);
    else if (subCategory === 'vegetarian_meal') saved = val * (7.0 - 0.5);
    else if (subCategory === 'chicken_meal') saved = val * (7.0 - 1.5);
    else if (subCategory === 'fish_meal') saved = val * (7.0 - 1.2);
  } else if (category === 'transportation') {
    if (subCategory === 'bicycle' || subCategory === 'walking') {
      saved = val * 0.21;
    } else if (subCategory === 'car_electric') {
      saved = val * (0.21 - 0.05);
    } else if (subCategory === 'bus' || subCategory === 'train' || subCategory === 'subway') {
      saved = val * (0.21 - 0.05); // compared to gasoline car
    }
  } else if (category === 'energy') {
    if (subCategory === 'solar' || subCategory === 'wind') {
      saved = val * 0.45;
    }
  } else if (category === 'shopping') {
    if (subCategory === 'clothing_sustainable') {
      saved = val * 0.02; // fast fashion (0.04) - sustainable (0.02)
    }
  }
  return parseFloat(saved.toFixed(4));
}

// ---------------------------------------------------------------------------
// Helper – Update user's ecoScore and totalCO2Saved
// ---------------------------------------------------------------------------
async function updateUserEcoMetrics(userId) {
  try {
    const user = await db.users.findOne({ _id: userId });
    if (!user) return;

    // Fetch only current month's activities for ecoScore calculation
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthActivities = await db.activities.find({ userId, date: { $gte: monthStart } });

    const ecoScore = calculateEcoScore(currentMonthActivities, user.monthlyGoal || 500);

    // Fetch all user activities for totalCO2Saved calculation (self-healing)
    const activities = await db.activities.find({ userId });
    let totalCO2Saved = 0;
    for (const act of activities) {
      totalCO2Saved += calculateCarbonSaved(act.category, act.subCategory, act.value);
    }

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
// Helper – Auto-progress active challenges on activity log
// ---------------------------------------------------------------------------
async function autoProgressChallenges(userId, activity) {
  try {
    const activeChallenges = await db.challenges.find({ userId, completed: false });
    for (const ch of activeChallenges) {
      let increment = 0;
      switch (ch.challengeId) {
        case 'meatless_week':
          if (activity.category === 'food' && ['vegetarian_meal', 'vegan_meal'].includes(activity.subCategory)) {
            increment = 1;
          }
          break;
        case 'bike_to_work':
          if (activity.category === 'transportation' && activity.subCategory === 'bicycle') {
            increment = 1;
          }
          break;
        case 'energy_detective':
          if (activity.category === 'energy') {
            increment = 1;
          }
          break;
        case 'zero_waste_week':
          if (activity.category === 'shopping' && activity.subCategory === 'clothing_sustainable') {
            increment = 1;
          }
          break;
        case 'public_transport':
          if (activity.category === 'transportation' && ['bus', 'train', 'subway'].includes(activity.subCategory)) {
            increment = 1;
          }
          break;
        case 'meatless_monday':
          if (activity.category === 'food' && ['vegetarian_meal', 'vegan_meal'].includes(activity.subCategory)) {
            increment = activity.value;
          }
          break;
        case 'vegan_week':
          if (activity.category === 'food' && activity.subCategory === 'vegan_meal') {
            increment = activity.value;
          }
          break;
        case 'bike_week':
          if (activity.category === 'transportation' && activity.subCategory === 'bicycle') {
            increment = 1;
          }
          break;
        case 'walk_to_work':
          if (activity.category === 'transportation' && activity.subCategory === 'walking') {
            increment = 1;
          }
          break;
        case 'carpool_week':
          if (activity.category === 'transportation' && activity.subCategory === 'carpool') {
            increment = 1;
          }
          break;
        case 'public_transit_hero':
          if (activity.category === 'transportation' && ['bus', 'train', 'subway'].includes(activity.subCategory)) {
            increment = 1;
          }
          break;
        case 'zero_car_day':
          if (activity.category === 'transportation' && ['bicycle', 'walking', 'bus', 'train', 'subway', 'carpool'].includes(activity.subCategory)) {
            increment = 1;
          }
          break;
        case 'solar_explorer':
          if (activity.category === 'energy' && activity.subCategory === 'solar') {
            increment = 1;
          }
          break;
        case 'energy_saver':
        case 'unplug_challenge':
        case 'cold_wash':
          if (activity.category === 'energy') {
            increment = 1;
          }
          break;
        case 'sustainable_shopper':
          if (activity.category === 'shopping' && activity.subCategory === 'clothing_sustainable') {
            increment = 1;
          }
          break;
        case 'no_fast_fashion':
          if (activity.category === 'shopping' && activity.subCategory !== 'clothing_fast') {
            increment = 1;
          }
          break;
        case 'local_food':
          if (activity.category === 'food' && activity.subCategory !== 'beef_meal' && activity.subCategory !== 'lamb_meal') {
            increment = 1;
          }
          break;
      }

      if (increment > 0) {
        const newValue = Math.min(ch.currentValue + increment, ch.targetValue);
        const updateFields = { currentValue: newValue };
        if (newValue >= ch.targetValue) {
          updateFields.completed = true;
          updateFields.completedAt = new Date();
        }
        await db.challenges.update({ _id: ch._id }, { $set: updateFields });
      }
    }
  } catch (err) {
    console.error('Error auto-progressing challenges:', err);
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

    const val = parseFloat(value);
    if (isNaN(val) || val <= 0) {
      return res.status(400).json({
        success: false,
        error: 'value must be a valid positive number',
      });
    }

    const factor = getEmissionFactor(category, subCategory);
    if (factor === null) {
      return res.status(400).json({
        success: false,
        error: `Unknown emission factor for ${category}/${subCategory}`,
      });
    }

    const carbonKg = parseFloat((val * factor).toFixed(4));
    const unit = unitForCategory(category);

    const activity = await db.activities.insert({
      userId: req.user._id,
      category,
      subCategory,
      value: val,
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

    // Auto-progress joined challenges
    await autoProgressChallenges(req.user._id, activity);

    // Update ecoScore and totalCO2Saved
    await updateUserEcoMetrics(req.user._id);

    // Check and award badges automatically
    await checkAndAwardBadges(req.user._id);

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
      if (startDate) {
        const d = new Date(startDate);
        if (!isNaN(d.getTime())) query.date.$gte = d;
      }
      if (endDate) {
        const d = new Date(endDate);
        if (!isNaN(d.getTime())) query.date.$lte = d;
      }
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
    await checkAndAwardBadges(req.user._id);

    return res.json({ success: true, data: { message: 'Activity deleted' } });
  } catch (err) {
    console.error('DELETE /api/activities/:id error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete activity' });
  }
});

module.exports = router;
