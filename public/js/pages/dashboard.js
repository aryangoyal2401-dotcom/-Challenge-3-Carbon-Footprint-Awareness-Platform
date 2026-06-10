/**
 * Dashboard Page Module
 */

import api from '../api.js';
import { createCategoryDonut, createWeeklyTrend } from '../charts.js';
import { animateValue, formatRelativeDate, getCategoryIcon, getCategoryColor, getSubCategoryLabel } from '../utils/helpers.js';
import { navigateTo } from '../router.js';

export async function init() {
  setupQuickActions();
  setupNavigateButtons();
  await loadDashboardData();
}

function setupQuickActions() {
  const quickActionCards = document.querySelectorAll('.quick-action-card[data-category]');
  quickActionCards.forEach(card => {
    card.addEventListener('click', () => {
      const category = card.dataset.category;
      window._preselectedCategory = category;
      navigateTo('log-activity');
    });
  });
}

function setupNavigateButtons() {
  const navBtns = document.querySelectorAll('[data-navigate]');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.navigate);
    });
  });
}

async function loadDashboardData() {
  const [summaryResult, breakdownResult, trendResult, activitiesResult] = await Promise.all([
    api.getDashboardSummary(),
    api.getCategoryBreakdown(),
    api.getWeeklyTrend(),
    api.getActivities({ limit: 5 })
  ]);

  populateStats(summaryResult);
  populateCategoryChart(breakdownResult);
  populateWeeklyChart(trendResult);
  populateRecentActivities(activitiesResult);
}

function populateStats(data) {
  const summary = data || {};

  const totalCO2El = document.querySelector('#stat-total-co2 .stat-value');
  const dailyAvgEl = document.querySelector('#stat-daily-avg .stat-value');
  const ecoScoreEl = document.querySelector('#stat-eco-score .stat-value');
  const streakEl = document.querySelector('#stat-streak .stat-value');

  const totalCO2 = summary.totalCO2 || summary.totalEmissions || 0;
  const dailyAvg = summary.dailyAverage || summary.dailyAvg || 0;
  const ecoScore = summary.ecoScore || 0;
  const streak = summary.streak || summary.currentStreak || 0;

  if (totalCO2El) animateValue(totalCO2El, 0, parseFloat(totalCO2), 1200);
  if (dailyAvgEl) animateValue(dailyAvgEl, 0, parseFloat(dailyAvg), 1200);
  if (ecoScoreEl) animateValue(ecoScoreEl, 0, parseInt(ecoScore), 1200);
  if (streakEl) animateValue(streakEl, 0, parseInt(streak), 800);
}

function populateCategoryChart(data) {
  const breakdown = data || {};
  const categories = breakdown.categories || breakdown.breakdown || {};

  const labels = ['Transportation', 'Food', 'Energy', 'Shopping'];
  const values = [
    categories.transportation || 0,
    categories.food || 0,
    categories.energy || 0,
    categories.shopping || 0
  ];

  createCategoryDonut('categoryChart', { labels, values });
}

function populateWeeklyChart(data) {
  const trend = data || {};
  const labels = trend.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const values = trend.values || trend.data || [0, 0, 0, 0, 0, 0, 0];

  createWeeklyTrend('weeklyChart', { labels, values });
}

function populateRecentActivities(data) {
  const container = document.getElementById('recent-activities');
  if (!container) return;

  const activities = Array.isArray(data) ? data : (data && data.activities ? data.activities : []);

  if (activities.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <h3>No activities yet</h3>
        <p>Start logging your daily activities to track your carbon footprint.</p>
        <button class="btn btn-primary" data-navigate="log-activity">Log Your First Activity</button>
      </div>
    `;
    setupNavigateButtons();
    return;
  }

  container.innerHTML = '';
  activities.forEach((activity, index) => {
    const item = createActivityItem(activity);
    item.style.animationDelay = `${index * 0.08}s`;
    item.classList.add('animate-fade-in-up');
    container.appendChild(item);
  });
}

function createActivityItem(activity) {
  const item = document.createElement('div');
  item.className = 'activity-item';

  const category = activity.category || 'general';
  const icon = getCategoryIcon(category);
  const color = getCategoryColor(category);
  const subLabel = getSubCategoryLabel(activity.subCategory || activity.type || '');
  const co2 = parseFloat(activity.co2Amount || activity.carbonKg || 0);

  item.innerHTML = `
    <div class="activity-icon" style="background: ${color}15; color: ${color};">
      ${icon}
    </div>
    <div class="activity-details">
      <div class="activity-name">${subLabel}</div>
      <div class="activity-meta">${formatRelativeDate(activity.date || activity.createdAt)} · ${activity.value || ''} ${activity.unit || ''}</div>
    </div>
    <div class="activity-co2">${co2.toFixed(1)} kg</div>
  `;

  return item;
}
