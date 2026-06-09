const express = require('express');
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

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
// Badge definitions (16 badges)
// ---------------------------------------------------------------------------
const BADGE_DEFINITIONS = [
  { id: 'first_log', name: 'First Step', icon: '👣', description: 'Log your first activity' },
  { id: 'week_streak', name: 'Week Warrior', icon: '🔥', description: '7-day logging streak' },
  { id: 'month_streak', name: 'Monthly Master', icon: '🏆', description: '30-day logging streak' },
  { id: 'carbon_cutter_10', name: 'Carbon Cutter', icon: '✂️', description: 'Save 10 kg CO₂' },
  { id: 'eco_cyclist', name: 'Eco Cyclist', icon: '🚴', description: 'Log 10 bike rides' },
  {
    id: 'plant_powered',
    name: 'Plant Powered',
    icon: '🌱',
    description: 'Log 20 vegan/vegetarian meals',
  },
  {
    id: 'transit_rider',
    name: 'Transit Rider',
    icon: '🚇',
    description: 'Use public transit 15 times',
  },
  {
    id: 'energy_guru',
    name: 'Energy Guru',
    icon: '💡',
    description: 'Log 30 low-energy days',
  },
  {
    id: 'carbon_cutter_100',
    name: 'Carbon Slasher',
    icon: '⚔️',
    description: 'Save 100 kg CO₂',
  },
  {
    id: 'five_challenges',
    name: 'Challenge Accepted',
    icon: '🎯',
    description: 'Complete 5 challenges',
  },
  {
    id: 'ten_challenges',
    name: 'Challenge Champion',
    icon: '🥇',
    description: 'Complete 10 challenges',
  },
  {
    id: 'eco_shopper',
    name: 'Eco Shopper',
    icon: '🛍️',
    description: 'Log 10 sustainable purchases',
  },
  {
    id: 'walker',
    name: 'Happy Walker',
    icon: '🥾',
    description: 'Log 20 walking trips',
  },
  {
    id: 'carbon_cutter_500',
    name: 'Carbon Hero',
    icon: '🦸',
    description: 'Save 500 kg CO₂',
  },
  {
    id: 'year_streak',
    name: 'Year Legend',
    icon: '🌟',
    description: '365-day logging streak',
  },
  {
    id: 'zero_emission_day',
    name: 'Zero Day',
    icon: '🌍',
    description: 'Log a day with zero emissions',
  },
];

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

// ---------------------------------------------------------------------------
// PUT /api/challenges/:id/progress – update progress
// ---------------------------------------------------------------------------
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

    // Check completion
    if (newValue >= challenge.targetValue) {
      updateFields.completed = true;
      updateFields.completedAt = new Date();

      // Award badge for completing challenges
      const completedCount = await db.challenges.count({
        userId: req.user._id,
        completed: true,
      });

      // +1 because current one isn't saved yet
      const totalCompleted = completedCount + 1;

      const user = await db.users.findOne({ _id: req.user._id });
      const userBadges = user.badges || [];
      const badgesToAward = [];

      if (totalCompleted >= 5 && !userBadges.some((b) => b.badgeId === 'five_challenges')) {
        badgesToAward.push({
          badgeId: 'five_challenges',
          name: 'Challenge Accepted',
          icon: '🎯',
          earnedAt: new Date(),
        });
      }

      if (totalCompleted >= 10 && !userBadges.some((b) => b.badgeId === 'ten_challenges')) {
        badgesToAward.push({
          badgeId: 'ten_challenges',
          name: 'Challenge Champion',
          icon: '🥇',
          earnedAt: new Date(),
        });
      }

      if (badgesToAward.length > 0) {
        await db.users.update(
          { _id: req.user._id },
          { $push: { badges: { $each: badgesToAward } } }
        );
      }
    }

    await db.challenges.update({ _id: req.params.id }, { $set: updateFields });

    const updated = await db.challenges.findOne({ _id: req.params.id });
    return res.json({ success: true, data: updated });
  } catch (err) {
    // nedb-promises doesn't support $each in $push, fallback to manual update
    if (err.message && err.message.includes('$each')) {
      try {
        const challenge = await db.challenges.findOne({ _id: req.params.id });
        const user = await db.users.findOne({ _id: req.user._id });
        const userBadges = user.badges || [];

        const completedCount = await db.challenges.count({
          userId: req.user._id,
          completed: true,
        });
        const totalCompleted = completedCount + 1;

        const badgesToAward = [];
        if (totalCompleted >= 5 && !userBadges.some((b) => b.badgeId === 'five_challenges')) {
          badgesToAward.push({
            badgeId: 'five_challenges',
            name: 'Challenge Accepted',
            icon: '🎯',
            earnedAt: new Date(),
          });
        }
        if (totalCompleted >= 10 && !userBadges.some((b) => b.badgeId === 'ten_challenges')) {
          badgesToAward.push({
            badgeId: 'ten_challenges',
            name: 'Challenge Champion',
            icon: '🥇',
            earnedAt: new Date(),
          });
        }

        const newBadges = [...userBadges, ...badgesToAward];
        await db.users.update({ _id: req.user._id }, { $set: { badges: newBadges } });

        const updated = await db.challenges.findOne({ _id: req.params.id });
        return res.json({ success: true, data: updated });
      } catch (innerErr) {
        console.error('PUT /api/challenges/:id/progress fallback error:', innerErr);
        return res.status(500).json({ success: false, error: 'Failed to update progress' });
      }
    }
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
    const user = await db.users.findOne({ _id: req.user._id });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const earnedMap = {};
    for (const badge of user.badges || []) {
      earnedMap[badge.badgeId] = badge.earnedAt;
    }

    const badges = BADGE_DEFINITIONS.map((def) => ({
      ...def,
      earned: !!earnedMap[def.id],
      earnedAt: earnedMap[def.id] || null,
    }));

    return res.json({ success: true, data: badges });
  } catch (err) {
    console.error('GET /api/challenges/badges error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch badges' });
  }
});

module.exports = router;
