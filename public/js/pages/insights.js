/**
 * Insights Page Module
 */

import api from '../api.js';
import { createComparisonBar } from '../charts.js';
import { animateValue } from '../utils/helpers.js';

const DEFAULT_TIPS = [
  {
    icon: '🚲',
    title: 'Switch to Active Transport',
    description: 'Walking or cycling for short trips (under 5 km) can eliminate transportation emissions entirely for those journeys.',
    impact: 'high'
  },
  {
    icon: '🥗',
    title: 'Try Meatless Mondays',
    description: 'Replacing one beef meal per week with a plant-based alternative can save over 300 kg CO₂ per year.',
    impact: 'high'
  },
  {
    icon: '💡',
    title: 'Switch to LED Lighting',
    description: 'LED bulbs use 75% less energy than incandescent lighting and last 25 times longer.',
    impact: 'medium'
  },
  {
    icon: '🛒',
    title: 'Buy Sustainable Brands',
    description: 'Fast fashion has 2x the carbon footprint of sustainable clothing. Choose quality over quantity.',
    impact: 'medium'
  },
  {
    icon: '🌡️',
    title: 'Optimize Home Temperature',
    description: 'Lowering your thermostat by 1°C can reduce heating emissions by up to 10%.',
    impact: 'medium'
  },
  {
    icon: '♻️',
    title: 'Reduce, Reuse, Recycle',
    description: 'Recycling aluminum saves 95% of the energy needed to produce new aluminum from raw materials.',
    impact: 'low'
  },
  {
    icon: '🚿',
    title: 'Shorter Showers',
    description: 'Reducing shower time by 2 minutes saves up to 10 gallons of water and the energy used to heat it.',
    impact: 'low'
  },
  {
    icon: '🔌',
    title: 'Unplug Idle Devices',
    description: 'Standby power consumption accounts for 5-10% of residential electricity use. Unplug chargers and electronics when not in use.',
    impact: 'low'
  },
  {
    icon: '🌳',
    title: 'Plant a Tree',
    description: 'A single tree absorbs approximately 22 kg of CO₂ per year, while providing shade and improving air quality.',
    impact: 'medium'
  }
];

export async function init() {
  await loadInsightsData();
}

async function loadInsightsData() {
  const [insightsResult, comparisonResult, equivalenciesResult] = await Promise.all([
    api.getInsights(),
    api.getComparison(),
    api.getEquivalencies()
  ]);

  populateEquivalencies(equivalenciesResult);
  populateComparisonChart(comparisonResult);
  populateInsightCards(insightsResult);
}

function populateEquivalencies(data) {
  const equivalencies = data || {};

  const treesEl = document.getElementById('impact-trees');
  const carKmEl = document.getElementById('impact-car-km');
  const phoneEl = document.getElementById('impact-phone-charges');

  const trees = equivalencies.treesNeeded || equivalencies.trees || 0;
  const carKm = equivalencies.carKmEquivalent || equivalencies.carKm || 0;
  const phoneCharges = equivalencies.smartphoneCharges || equivalencies.phoneCharges || 0;

  if (treesEl) animateValue(treesEl, 0, parseFloat(trees), 1500);
  if (carKmEl) animateValue(carKmEl, 0, parseFloat(carKm), 1500);
  if (phoneEl) animateValue(phoneEl, 0, parseFloat(phoneCharges), 1500);
}

function populateComparisonChart(data) {
  const comparison = data || {};

  const userData = comparison.userAnnual || comparison.user || 0;
  const nationalAvg = comparison.nationalAverage || comparison.national || 4500;
  const globalAvg = comparison.globalAverage || comparison.global || 4700;
  const netZeroTarget = comparison.netZeroTarget || comparison.netZero || 2000;

  createComparisonBar('comparisonChart', userData, nationalAvg, globalAvg, netZeroTarget);
}

function populateInsightCards(data) {
  const container = document.getElementById('insight-cards');
  if (!container) return;

  const insights = data || {};
  const tips = insights.tips || insights.recommendations || DEFAULT_TIPS;

  if (!tips || tips.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">💡</div>
        <h3>Log more activities</h3>
        <p>We need more data to generate personalized insights for you.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  container.classList.add('grid-3');

  tips.forEach((tip, index) => {
    const card = document.createElement('div');
    card.className = 'insight-card glass-card animate-fade-in-up';
    card.style.animationDelay = `${index * 0.1}s`;

    const impact = tip.impact || 'medium';
    const impactLabels = {
      high: 'High Impact',
      medium: 'Medium Impact',
      low: 'Low Impact'
    };

    card.innerHTML = `
      <div class="insight-card-header">
        <div class="insight-icon">${tip.icon || '💡'}</div>
        <div class="insight-title">${tip.title || 'Eco Tip'}</div>
      </div>
      <div class="insight-description">${tip.description || ''}</div>
      <div class="insight-badge ${impact}">${impactLabels[impact] || 'Medium Impact'}</div>
    `;

    container.appendChild(card);
  });
}
