/**
 * EcoTrack — Business Logic Unit Test Suite
 * Tests emission factors and insights engines.
 *
 * Run:  node tests/utils.test.js
 */

const assert = require('assert');
const { getEmissionFactor, EMISSION_FACTORS } = require('../utils/emissionFactors');
const {
  calculateEcoScore,
  calculateEquivalencies,
  getComparisonData,
  generateInsights
} = require('../utils/insightEngine');

let passed = 0;
let failed = 0;

function testAssert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.log(`  ❌ ${message}`);
  }
}

function runUtilsTests() {
  console.log('═══════════════════════════════════════════');
  console.log('  🧪 EcoTrack Utilities Test Suite');
  console.log('═══════════════════════════════════════════');

  // 1. Emission Factors tests
  console.log('\n📋 Emission Factors');
  testAssert(getEmissionFactor('transportation', 'car_gasoline') === 0.21, 'car_gasoline factor is 0.21');
  testAssert(getEmissionFactor('energy', 'electricity_india') === 0.82, 'electricity_india factor is 0.82');
  testAssert(getEmissionFactor('food', 'vegan_meal') === 0.3, 'vegan_meal factor is 0.3');
  testAssert(getEmissionFactor('invalid_category', 'some_sub') === null, 'returns null for invalid category');
  testAssert(getEmissionFactor('food', 'invalid_sub') === null, 'returns null for invalid subcategory');

  // 2. Eco Score tests
  console.log('\n📋 Eco Score Engine');
  testAssert(calculateEcoScore([]) === 50, 'Returns 50 for empty activities');
  
  const activities = [
    { category: 'transportation', subCategory: 'car_gasoline', carbonKg: 100 },
    { category: 'food', subCategory: 'beef_meal', carbonKg: 50 }
  ];
  // total = 150. monthlyGoal = 500. ratio = 150 / 500 = 0.3. score = 100 - (0.3 * 50) = 85.
  testAssert(calculateEcoScore(activities, 500) === 85, 'Calculates correct eco score (85)');
  testAssert(calculateEcoScore(activities, 100) === 25, 'Calculates correct eco score with small goal (25)');
  testAssert(calculateEcoScore(activities, 50) === 0, 'Caps score at 0');

  // 3. Equivalency Engine tests
  console.log('\n📋 Carbon Equivalencies');
  const equivs = calculateEquivalencies(1000); // 1000 kg = 1 ton
  testAssert(equivs.trees === 6, '1 ton of CO2 is equivalent to 6 trees');
  testAssert(equivs.carKm === 4760, '1000 kg is equivalent to 4760 car km');
  testAssert(equivs.smartphoneCharges === 122000, '1000 kg is equivalent to 122,000 charges');

  // 4. Comparison Data tests
  console.log('\n📋 Regional Comparisons');
  const comp = getComparisonData(200, 'india');
  testAssert(comp.userMonthly === 200, 'User monthly total matches');
  testAssert(comp.nationalAvg === 150, 'India national average is 150');
  testAssert(comp.globalAvg === 400, 'Global average is 400');
  testAssert(comp.vsNational === 33.3, 'Calculates correct comparison percentage to India (+33.3%)');

  // 5. Insights Engine tests
  console.log('\n📋 Insights Engine');
  const generalInsight = generateInsights([]);
  testAssert(generalInsight.length === 1 && generalInsight[0].title === 'Start Tracking', 'Empty activities yield start tracking insight');

  const detailedActivities = [
    { category: 'transportation', subCategory: 'car_gasoline', carbonKg: 50 },
    { category: 'food', subCategory: 'beef_meal', carbonKg: 14 },
    { category: 'energy', subCategory: 'electricity_india', carbonKg: 20 }
  ];
  const userProfile = { profile: { dietType: 'heavy-meat' } };
  const insights = generateInsights(detailedActivities, userProfile);
  
  testAssert(insights.some(i => i.title.includes('Transportation is Your Top Source')), 'Generates top source insight');
  testAssert(insights.some(i => i.title === 'Switch to Cycling'), 'Generates transportation cycling saving tip');
  testAssert(insights.some(i => i.title === 'Meatless Mondays'), 'Generates diet-specific tip');
  testAssert(insights.length > 3, 'Generates multiple relevant insights');

  console.log('\n═══════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('═══════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runUtilsTests();
