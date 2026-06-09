/**
 * EcoTrack — API Client Module
 * Handles all HTTP requests to the Express backend
 * Uses local JWT token from localStorage (no Firebase)
 */

import { getToken, logout } from './auth.js';
import { showToast } from './utils/toast.js';

const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data = await res.json();

    if (res.status === 401) {
      logout();
      window.location.reload();
      return null;
    }

    if (!data.success) {
      showToast(data.error || 'Request failed', 'error');
      return null;
    }
    return data.data;
  } catch (err) {
    console.error('API Error:', err);
    showToast('Network error. Please try again.', 'error');
    return null;
  }
}

const api = {
  // Auth
  syncUser: () => request('/auth/sync', { method: 'POST' }),
  getProfile: () => request('/auth/profile'),
  updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  deleteAccount: () => request('/auth/account', { method: 'DELETE' }),

  // Activities
  createActivity: (data) => request('/activities', { method: 'POST', body: JSON.stringify(data) }),
  getActivities: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/activities${qs ? '?' + qs : ''}`);
  },
  deleteActivity: (id) => request(`/activities/${id}`, { method: 'DELETE' }),

  // Dashboard
  getDashboardSummary: () => request('/dashboard/summary'),
  getCategoryBreakdown: () => request('/dashboard/category-breakdown'),
  getWeeklyTrend: () => request('/dashboard/weekly-trend'),
  getMonthlyTrend: () => request('/dashboard/monthly-trend'),

  // Insights
  getInsights: () => request('/insights'),
  getComparison: () => request('/insights/comparison'),
  getEquivalencies: () => request('/insights/equivalencies'),

  // Challenges
  getAvailableChallenges: () => request('/challenges/available'),
  joinChallenge: (id) => request(`/challenges/join/${id}`, { method: 'POST' }),
  updateChallengeProgress: (id, data) => request(`/challenges/${id}/progress`, { method: 'PUT', body: JSON.stringify(data) }),
  getActiveChallenges: () => request('/challenges/active'),
  getCompletedChallenges: () => request('/challenges/completed'),
  getBadges: () => request('/challenges/badges'),

  // Admin
  getAdminStats: () => request('/admin/stats'),
  getAdminUsers: () => request('/admin/users'),
  deleteAdminUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),

  // Leaderboard
  getLeaderboard: () => request('/leaderboard'),
  getUserRank: () => request('/leaderboard/rank'),
};

export default api;
