const db = require('../config/db');

// List of all badge definitions matching routes/challenges.js and public/js/pages/challenges.js
const BADGE_DEFINITIONS = [
  { id: 'first_log', name: 'First Step', icon: '👣', description: 'Log your first activity' },
  { id: 'week_streak', name: 'Week Warrior', icon: '🔥', description: '7-day logging streak' },
  { id: 'month_streak', name: 'Monthly Master', icon: '🏆', description: '30-day logging streak' },
  { id: 'carbon_cutter_10', name: 'Carbon Cutter', icon: '✂️', description: 'Save 10 kg CO₂' },
  { id: 'eco_cyclist', name: 'Eco Cyclist', icon: '🚴', description: 'Log 10 bike rides' },
  { id: 'plant_powered', name: 'Plant Powered', icon: '🌱', description: 'Log 20 vegan/vegetarian meals' },
  { id: 'transit_rider', name: 'Transit Rider', icon: '🚇', description: 'Use public transit 15 times' },
  { id: 'energy_guru', name: 'Energy Guru', icon: '💡', description: 'Log 30 low-energy days' },
  { id: 'carbon_cutter_100', name: 'Carbon Slasher', icon: '⚔️', description: 'Save 100 kg CO₂' },
  { id: 'five_challenges', name: 'Challenge Accepted', icon: '🎯', description: 'Complete 5 challenges' },
  { id: 'ten_challenges', name: 'Challenge Champion', icon: '🥇', description: 'Complete 10 challenges' },
  { id: 'eco_shopper', name: 'Eco Shopper', icon: '🛍️', description: 'Log 10 sustainable purchases' },
  { id: 'walker', name: 'Happy Walker', icon: '🥾', description: 'Log 20 walking trips' },
  { id: 'carbon_cutter_500', name: 'Carbon Hero', icon: '🦸', description: 'Save 500 kg CO₂' },
  { id: 'year_streak', name: 'Year Legend', icon: '🌟', description: '365-day logging streak' },
  { id: 'zero_emission_day', name: 'Zero Day', icon: '🌍', description: 'Log a day with zero emissions' },
];

/**
 * Checks all badge conditions for a user and awards any newly earned badges.
 * @param {string} userId - The ID of the user
 * @returns {Promise<Array>} - Array of newly earned badges
 */
async function checkAndAwardBadges(userId) {
  try {
    const user = await db.users.findOne({ _id: userId });
    if (!user) return [];

    const activities = await db.activities.find({ userId });
    const completedChallengesCount = await db.challenges.count({ userId, completed: true });

    const userBadges = user.badges || [];
    const currentBadgeIds = new Set(userBadges.map(b => b.badgeId));
    const newBadges = [];

    const award = (id, name, icon) => {
      if (!currentBadgeIds.has(id)) {
        newBadges.push({
          badgeId: id,
          name,
          icon,
          earnedAt: new Date()
        });
      }
    };

    // 1. first_log
    if (activities.length >= 1) {
      award('first_log', 'First Step', '👣');
    }

    // 2. week_streak
    if (user.longestStreak >= 7 || user.currentStreak >= 7) {
      award('week_streak', 'Week Warrior', '🔥');
    }

    // 3. month_streak
    if (user.longestStreak >= 30 || user.currentStreak >= 30) {
      award('month_streak', 'Monthly Master', '🏆');
    }

    // 4. year_streak
    if (user.longestStreak >= 365 || user.currentStreak >= 365) {
      award('year_streak', 'Year Legend', '🌟');
    }

    // 5. carbon_cutter_10
    if (user.totalCO2Saved >= 10) {
      award('carbon_cutter_10', 'Carbon Cutter', '✂️');
    }

    // 6. carbon_cutter_100
    if (user.totalCO2Saved >= 100) {
      award('carbon_cutter_100', 'Carbon Slasher', '⚔️');
    }

    // 7. carbon_cutter_500
    if (user.totalCO2Saved >= 500) {
      award('carbon_cutter_500', 'Carbon Hero', '🦸');
    }

    // 8. eco_cyclist
    const bikeRides = activities.filter(a => a.category === 'transportation' && a.subCategory === 'bicycle').length;
    if (bikeRides >= 10) {
      award('eco_cyclist', 'Eco Cyclist', '🚴');
    }

    // 9. walker
    const walks = activities.filter(a => a.category === 'transportation' && a.subCategory === 'walking').length;
    if (walks >= 20) {
      award('walker', 'Happy Walker', '🥾');
    }

    // 10. transit_rider
    const transitRides = activities.filter(a => a.category === 'transportation' && ['bus', 'train', 'subway'].includes(a.subCategory)).length;
    if (transitRides >= 15) {
      award('transit_rider', 'Transit Rider', '🚇');
    }

    // 11. plant_powered
    const vegMeals = activities.filter(a => a.category === 'food' && ['vegan_meal', 'vegetarian_meal'].includes(a.subCategory)).length;
    if (vegMeals >= 20) {
      award('plant_powered', 'Plant Powered', '🌱');
    }

    // 12. energy_guru
    const lowEnergyDays = activities.filter(a => a.category === 'energy' && (['solar', 'wind'].includes(a.subCategory) || a.value < 5)).length;
    if (lowEnergyDays >= 30) {
      award('energy_guru', 'Energy Guru', '💡');
    }

    // 13. eco_shopper
    const sustainablePurchases = activities.filter(a => a.category === 'shopping' && a.subCategory === 'clothing_sustainable').length;
    if (sustainablePurchases >= 10) {
      award('eco_shopper', 'Eco Shopper', '🛍️');
    }

    // 14. zero_emission_day
    const zeroEmissionAct = activities.some(a => a.carbonKg === 0);
    if (zeroEmissionAct) {
      award('zero_emission_day', 'Zero Day', '🌍');
    }

    // 15. five_challenges
    if (completedChallengesCount >= 5) {
      award('five_challenges', 'Challenge Accepted', '🎯');
    }

    // 16. ten_challenges
    if (completedChallengesCount >= 10) {
      award('ten_challenges', 'Challenge Champion', '🥇');
    }

    if (newBadges.length > 0) {
      const updatedBadges = [...userBadges, ...newBadges];
      await db.users.update({ _id: userId }, { $set: { badges: updatedBadges } });
    }

    return newBadges;
  } catch (err) {
    console.error('Error checking and awarding badges:', err);
    return [];
  }
}

module.exports = {
  checkAndAwardBadges,
  BADGE_DEFINITIONS
};
