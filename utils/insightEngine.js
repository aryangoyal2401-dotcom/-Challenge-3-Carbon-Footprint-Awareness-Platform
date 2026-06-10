const { NATIONAL_AVERAGES, EQUIVALENCIES } = require('./emissionFactors');

// ---------------------------------------------------------------------------
// generateInsights
// ---------------------------------------------------------------------------
function generateInsights(activities, userProfile) {
  const insights = [];

  if (!activities || activities.length === 0) {
    insights.push({
      title: 'Start Tracking',
      description:
        'Log your first activity to begin receiving personalized carbon insights and tips.',
      impact: 'high',
      category: 'general',
      icon: '📊',
      actionable: true,
    });
    return insights;
  }

  // --- aggregate totals per category ---
  const categoryTotals = {};
  const subCategoryTotals = {};
  let totalCO2 = 0;

  for (const act of activities) {
    categoryTotals[act.category] = (categoryTotals[act.category] || 0) + act.carbonKg;
    const key = `${act.category}::${act.subCategory}`;
    subCategoryTotals[key] = (subCategoryTotals[key] || 0) + act.carbonKg;
    totalCO2 += act.carbonKg;
  }

  // --- highest emission category ---
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const [topCategory, topCO2] = sortedCategories[0] || ['none', 0];
  const topPct = totalCO2 > 0 ? Math.round((topCO2 / totalCO2) * 100) : 0;

  insights.push({
    title: `${capitalize(topCategory)} is Your Top Source`,
    description: `${capitalize(topCategory)} accounts for ${topPct}% (${topCO2.toFixed(1)} kg CO₂) of your recent emissions. Focus here for the biggest impact.`,
    impact: 'high',
    category: topCategory,
    icon: categoryIcon(topCategory),
    actionable: true,
  });

  // --- transportation switch potential ---
  const carKg =
    (subCategoryTotals['transportation::car_gasoline'] || 0) +
    (subCategoryTotals['transportation::car_diesel'] || 0);
  if (carKg > 0) {
    const bikeSaving = carKg * 1; // bicycle = 0 factor → 100 % saving
    insights.push({
      title: 'Switch to Cycling',
      description: `Replacing car trips with cycling could save up to ${bikeSaving.toFixed(1)} kg CO₂. Even switching half your trips makes a big difference.`,
      impact: 'high',
      category: 'transportation',
      icon: '🚴',
      actionable: true,
    });

    const transitSaving = carKg * 0.6; // public transit ≈ 60 % cheaper
    insights.push({
      title: 'Try Public Transit',
      description: `Using buses and trains instead of driving could cut up to ${transitSaving.toFixed(1)} kg CO₂ from your footprint.`,
      impact: 'medium',
      category: 'transportation',
      icon: '🚆',
      actionable: true,
    });
  }

  // --- food insights ---
  const meatMeals =
    (subCategoryTotals['food::beef_meal'] || 0) +
    (subCategoryTotals['food::lamb_meal'] || 0) +
    (subCategoryTotals['food::pork_meal'] || 0);
  if (meatMeals > 0) {
    const vegSaving = meatMeals - meatMeals * 0.1; // veg meal ≈ 90 % less
    insights.push({
      title: 'Go Plant-Based More Often',
      description: `Switching ${Math.ceil(meatMeals / 5)} meat meals to vegetarian options could save about ${vegSaving.toFixed(1)} kg CO₂.`,
      impact: 'high',
      category: 'food',
      icon: '🥗',
      actionable: true,
    });
  }

  // --- energy insights ---
  const energyTotal = categoryTotals.energy || 0;
  if (energyTotal > 0) {
    insights.push({
      title: 'Reduce Standby Power',
      description:
        'Unplugging electronics when not in use can cut household energy consumption by up to 10 %, saving both emissions and money.',
      impact: 'medium',
      category: 'energy',
      icon: '🔌',
      actionable: true,
    });
  }

  // --- shopping insights ---
  const shoppingTotal = categoryTotals.shopping || 0;
  if (shoppingTotal > 0) {
    insights.push({
      title: 'Buy Sustainable Fashion',
      description:
        'Choosing sustainably-produced clothing emits roughly half the CO₂ of fast fashion. Consider quality over quantity.',
      impact: 'medium',
      category: 'shopping',
      icon: '👗',
      actionable: true,
    });
  }

  // --- diet-aware tip ---
  const diet = userProfile?.profile?.dietType || 'mixed';
  if (diet === 'heavy-meat') {
    insights.push({
      title: 'Meatless Mondays',
      description:
        'As a heavy-meat eater, replacing just one meal a week with a plant-based option can save over 300 kg CO₂ per year.',
      impact: 'high',
      category: 'food',
      icon: '🌱',
      actionable: true,
    });
  } else if (diet === 'vegan' || diet === 'vegetarian') {
    insights.push({
      title: 'Great Diet Choice!',
      description: `Your ${diet} diet already has a much lower carbon footprint than average. Keep it up!`,
      impact: 'low',
      category: 'food',
      icon: '🏅',
      actionable: false,
    });
  }

  // --- general evergreen tips ---
  insights.push({
    title: 'Track Consistently',
    description:
      'Logging activities daily helps you identify patterns and stay motivated. Set a daily reminder!',
    impact: 'low',
    category: 'general',
    icon: '📅',
    actionable: true,
  });

  insights.push({
    title: 'Set a Monthly Goal',
    description:
      'Having a concrete target makes it easier to cut emissions. Aim for 10 % below last month.',
    impact: 'medium',
    category: 'general',
    icon: '🎯',
    actionable: true,
  });

  // Return max 8 insights
  return insights.slice(0, 8);
}

// ---------------------------------------------------------------------------
// calculateEcoScore
// ---------------------------------------------------------------------------
function calculateEcoScore(activities, monthlyGoal = 500) {
  if (!activities || activities.length === 0) return 50;

  const totalCO2 = activities.reduce((sum, a) => sum + a.carbonKg, 0);
  const ratio = totalCO2 / monthlyGoal;

  // Lower emissions → higher score
  // ratio 0 → score 100, ratio 1 → score 50, ratio 2+ → score 0
  let score = Math.round(100 - ratio * 50);
  score = Math.max(0, Math.min(100, score));
  return score;
}

// ---------------------------------------------------------------------------
// calculateEquivalencies
// ---------------------------------------------------------------------------
function calculateEquivalencies(totalCO2Kg) {
  const tons = totalCO2Kg / 1000;
  return {
    trees: parseFloat((tons * EQUIVALENCIES.treesPerTonCO2).toFixed(2)),
    carKm: parseFloat((totalCO2Kg * EQUIVALENCIES.kmPerKgCO2).toFixed(1)),
    smartphoneCharges: Math.round(totalCO2Kg * EQUIVALENCIES.smartphoneChargesPerKgCO2),
    lightbulbHours: Math.round(totalCO2Kg * EQUIVALENCIES.lightbulbHoursPerKgCO2),
  };
}

// ---------------------------------------------------------------------------
// getComparisonData
// ---------------------------------------------------------------------------
function getComparisonData(totalMonthly, region = 'global') {
  const nationalAvg = NATIONAL_AVERAGES[region] || NATIONAL_AVERAGES.global;
  const globalAvg = NATIONAL_AVERAGES.global;
  const netZeroTarget = 167; // ≈ 2 t CO₂ / year / person

  return {
    userMonthly: parseFloat(totalMonthly.toFixed(1)),
    nationalAvg,
    globalAvg,
    netZeroTarget,
    vsNational: parseFloat(((totalMonthly - nationalAvg) / nationalAvg * 100).toFixed(1)),
    vsGlobal: parseFloat(((totalMonthly - globalAvg) / globalAvg * 100).toFixed(1)),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function categoryIcon(category) {
  const icons = {
    transportation: '🚗',
    energy: '⚡',
    food: '🍽️',
    shopping: '🛒',
  };
  return icons[category] || '📊';
}

module.exports = {
  generateInsights,
  calculateEcoScore,
  calculateEquivalencies,
  getComparisonData,
};
