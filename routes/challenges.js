const express = require('express');
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const { checkAndAwardBadges, BADGE_DEFINITIONS } = require('../utils/badgeEngine');

const router = express.Router();

// ---------------------------------------------------------------------------
// Challenge templates (14 challenges)
// ---------------------------------------------------------------------------
const CHALLENGE_TEMPLATES = [
  {
    id: 'meatless_monday',
    title: 'Meatless Monday',
    description: 'Log only vegetarian or vegan meals today',
    type: 'daily',
    category: 'food',
    targetValue: 3,
    icon: '🥗',
  },
  {
    id: 'bike_week',
    title: 'Bike Week',
    description: 'Use bicycle for transportation 5 times this week',
    type: 'weekly',
    category: 'transportation',
    targetValue: 5,
    icon: '🚴',
  },
  {
    id: 'energy_saver',
    title: 'Energy Saver',
    description: 'Keep daily electricity under 5 kWh for a week',
    type: 'weekly',
    category: 'energy',
    targetValue: 7,
    icon: '⚡',
  },
  {
    id: 'zero_car_day',
    title: 'Zero Car Day',
    description: 'Go an entire day without using a car',
    type: 'daily',
    category: 'transportation',
    targetValue: 1,
    icon: '🚶',
  },
  {
    id: 'public_transit_hero',
    title: 'Public Transit Hero',
    description: 'Use public transit 10 times this month',
    type: 'monthly',
    category: 'transportation',
    targetValue: 10,
    icon: '🚌',
  },
  {
    id: 'vegan_week',
    title: 'Vegan Week',
    description: 'Eat only vegan meals for 7 consecutive days',
    type: 'weekly',
    category: 'food',
    targetValue: 21,
    icon: '🌱',
  },
  {
    id: 'unplug_challenge',
    title: 'Unplug Challenge',
    description: 'Reduce energy usage by unplugging devices for 5 days',
    type: 'weekly',
    category: 'energy',
    targetValue: 5,
    icon: '🔌',
  },
  {
    id: 'no_fast_fashion',
    title: 'No Fast Fashion',
    description: 'Avoid fast fashion purchases for the entire month',
    type: 'monthly',
    category: 'shopping',
    targetValue: 30,
    icon: '👗',
  },
  {
    id: 'local_food',
    title: 'Local Food Champion',
    description: 'Buy groceries from local sources 8 times this month',
    type: 'monthly',
    category: 'food',
    targetValue: 8,
    icon: '🏪',
  },
  {
    id: 'carpool_week',
    title: 'Carpool Week',
    description: 'Carpool at least 4 times this week',
    type: 'weekly',
    category: 'transportation',
    targetValue: 4,
    icon: '🚙',
  },
  {
    id: 'cold_wash',
    title: 'Cold Wash Week',
    description: 'Wash all laundry in cold water for a week',
    type: 'weekly',
    category: 'energy',
    targetValue: 7,
    icon: '🧊',
  },
  {
    id: 'sustainable_shopper',
    title: 'Sustainable Shopper',
    description: 'Make 5 sustainable shopping choices this month',
    type: 'monthly',
    category: 'shopping',
    targetValue: 5,
    icon: '♻️',
  },
  {
    id: 'walk_to_work',
    title: 'Walk to Work',
    description: 'Walk to your destination 3 times this week',
    type: 'weekly',
    category: 'transportation',
    targetValue: 3,
    icon: '🚶‍♂️',
  },
  {
    id: 'solar_explorer',
    title: 'Solar Explorer',
    description: 'Use renewable energy sources for 10 days this month',
    type: 'monthly',
    category: 'energy',
    targetValue: 10,
    icon: '☀️',
  },
];

// ---------------------------------------------------------------------------
// Badge definitions are imported from utils/badgeEngine.js

// ---------------------------------------------------------------------------
// GET /api/challenges/available – templates with join status
// ---------------------------------------------------------------------------
router.get('/available', verifyToken, async (req, res) => {
  try {
    // Get user's active (non-completed) challenges
    const joined = await db.challenges.find({
      userId: req.user._id,
      completed: false,
    });

    const joinedIds = new Set(joined.map((c) => c.challengeId));

    const available = CHALLENGE_TEMPLATES.map((tpl) => ({
      ...tpl,
      joined: joinedIds.has(tpl.id),
    }));

    return res.json({ success: true, data: available });
  } catch (err) {
    console.error('GET /api/challenges/available error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch challenges' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/challenges/join/:challengeId – join a challenge
// ---------------------------------------------------------------------------
router.post('/join/:challengeId', verifyToken, async (req, res) => {
  try {
    const template = CHALLENGE_TEMPLATES.find((t) => t.id === req.params.challengeId);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Challenge template not found' });
    }

    // Check if already joined and active
    const existing = await db.challenges.findOne({
      userId: req.user._id,
      challengeId: template.id,
      completed: false,
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'You have already joined this challenge',
      });
    }

    const now = new Date();
    let endDate;

    switch (template.type) {
      case 'daily':
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        endDate = new Date(now);
        endDate.setDate(endDate.getDate() + 7);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        endDate = new Date(now);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        endDate = new Date(now);
        endDate.setDate(endDate.getDate() + 7);
    }

    const challenge = await db.challenges.insert({
      userId: req.user._id,
      challengeId: template.id,
      title: template.title,
      description: template.description,
      icon: template.icon,
      type: template.type,
      category: template.category,
      targetValue: template.targetValue,
      currentValue: 0,
      startDate: now,
      endDate,
      completed: false,
    });

    return res.status(201).json({ success: true, data: challenge });
  } catch (err) {
    console.error('POST /api/challenges/join error:', err);
    return res.status(500).json({ success: false, error: 'Failed to join challenge' });
  }
});

router.put('/:id/progress', verifyToken, async (req, res) => {
  try {
    const challenge = await db.challenges.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!challenge) {
      return res.status(404).json({ success: false, error: 'Challenge not found' });
    }

    if (challenge.completed) {
      return res.status(400).json({ success: false, error: 'Challenge already completed' });
    }

    const { increment } = req.body;
    const incrementValue = typeof increment === 'number' ? increment : 1;
    const newValue = Math.min(challenge.currentValue + incrementValue, challenge.targetValue);
    const updateFields = { currentValue: newValue };

    if (newValue >= challenge.targetValue) {
      updateFields.completed = true;
      updateFields.completedAt = new Date();
    }

    await db.challenges.update({ _id: req.params.id }, { $set: updateFields });

    // Check and award badges automatically
    await checkAndAwardBadges(req.user._id);

    const updated = await db.challenges.findOne({ _id: req.params.id });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('PUT /api/challenges/:id/progress error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update progress' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/challenges/active – user's active challenges
// ---------------------------------------------------------------------------
router.get('/active', verifyToken, async (req, res) => {
  try {
    const active = await db.challenges
      .find({ userId: req.user._id, completed: false })
      .sort({ startDate: -1 });

    return res.json({ success: true, data: active });
  } catch (err) {
    console.error('GET /api/challenges/active error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch active challenges' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/challenges/completed – user's completed challenges
// ---------------------------------------------------------------------------
router.get('/completed', verifyToken, async (req, res) => {
  try {
    const completed = await db.challenges
      .find({ userId: req.user._id, completed: true })
      .sort({ completedAt: -1 });

    return res.json({ success: true, data: completed });
  } catch (err) {
    console.error('GET /api/challenges/completed error:', err);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch completed challenges' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/challenges/badges – all badges with earned status
// ---------------------------------------------------------------------------
router.get('/badges', verifyToken, async (req, res) => {
  try {
    // First check and award any badges to ensure the user gets their latest badges
    await checkAndAwardBadges(req.user._id);

    const user = await db.users.findOne({ _id: req.user._id });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const earnedMap = {};
    for (const badge of user.badges || []) {
      earnedMap[badge.badgeId] = badge.earnedAt;
    }

    const allBadges = BADGE_DEFINITIONS.map((def) => ({
      ...def,
      earned: !!earnedMap[def.id],
      earnedAt: earnedMap[def.id] || null,
    }));

    return res.json({
      success: true,
      data: {
        badges: user.badges || [],
        all: allBadges
      }
    });
  } catch (err) {
    console.error('GET /api/challenges/badges error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch badges' });
  }
});

module.exports = router;
