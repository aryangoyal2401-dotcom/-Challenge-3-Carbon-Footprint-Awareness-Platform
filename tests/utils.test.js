/**
 * EcoTrack — Business Logic Unit Test Suite
 * Powered by Jest
 */

const { getEmissionFactor } = require('../utils/emissionFactors');
const {
  calculateEcoScore,
  calculateEquivalencies,
  getComparisonData,
  generateInsights
} = require('../utils/insightEngine');

describe('EcoTrack Utilities', () => {
  test('Emission Factors Lookup', () => {
    expect(getEmissionFactor('transportation', 'car_gasoline')).toBe(0.21);
    expect(getEmissionFactor('energy', 'electricity_india')).toBe(0.82);
    expect(getEmissionFactor('food', 'vegan_meal')).toBe(0.3);
    expect(getEmissionFactor('invalid_category', 'some_sub')).toBeNull();
    expect(getEmissionFactor('food', 'invalid_sub')).toBeNull();
  });

  test('Eco Score Calculation', () => {
    expect(calculateEcoScore([])).toBe(50);
    const activities = [
      { category: 'transportation', subCategory: 'car_gasoline', carbonKg: 100 },
      { category: 'food', subCategory: 'beef_meal', carbonKg: 50 }
    ];
    expect(calculateEcoScore(activities, 500)).toBe(85);
    expect(calculateEcoScore(activities, 100)).toBe(25);
    expect(calculateEcoScore(activities, 50)).toBe(0);
  });

  test('Carbon Equivalencies', () => {
    const equivs = calculateEquivalencies(1000);
    expect(equivs.trees).toBe(6);
    expect(equivs.carKm).toBe(4760);
    expect(equivs.smartphoneCharges).toBe(122000);
  });

  test('Regional Comparisons', () => {
    const comp = getComparisonData(200, 'india');
    expect(comp.userMonthly).toBe(200);
    expect(comp.nationalAvg).toBe(150);
    expect(comp.globalAvg).toBe(400);
    expect(comp.vsNational).toBe(33.3);
  });

  test('Insights Generation', () => {
    const emptyInsights = generateInsights([]);
    expect(emptyInsights).toHaveLength(1);
    expect(emptyInsights[0].title).toBe('Start Tracking');

    const detailedActivities = [
      { category: 'transportation', subCategory: 'car_gasoline', carbonKg: 50 },
      { category: 'food', subCategory: 'beef_meal', carbonKg: 14 },
      { category: 'energy', subCategory: 'electricity_india', carbonKg: 20 }
    ];
    const userProfile = { profile: { dietType: 'heavy-meat' } };
    const insights = generateInsights(detailedActivities, userProfile);
    expect(insights.some(i => i.title.includes('Transportation is Your Top Source'))).toBe(true);
    expect(insights.some(i => i.title === 'Switch to Cycling')).toBe(true);
    expect(insights.some(i => i.title === 'Meatless Mondays')).toBe(true);
    expect(insights.length).toBeGreaterThan(3);
  });
});
