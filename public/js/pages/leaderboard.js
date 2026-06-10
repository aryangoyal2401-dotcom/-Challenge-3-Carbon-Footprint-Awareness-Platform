/**
 * Leaderboard Page Module
 */

import api from '../api.js';
import { animateValue, escapeHTML } from '../utils/helpers.js';

export async function init() {
  await loadLeaderboardData();
}

async function loadLeaderboardData() {
  const [leaderboardResult, rankResult] = await Promise.all([
    api.getLeaderboard(),
    api.getUserRank()
  ]);

  renderUserRank(rankResult);
  renderLeaderboard(leaderboardResult);
}

function renderUserRank(data) {
  const rankCard = document.getElementById('user-rank-card');
  if (!rankCard) return;

  const rankData = data || {};
  const rank = rankData.rank || rankData.position || '--';
  const ecoScore = rankData.ecoScore || rankData.score || 0;
  const badges = rankData.badgesCount || rankData.badges || 0;

  const rankNumberEl = rankCard.querySelector('.rank-number');
  if (rankNumberEl) {
    rankNumberEl.textContent = `#${rank}`;
  }

  const ecoScoreEl = document.getElementById('rank-eco-score');
  const badgesEl = document.getElementById('rank-badges');

  if (ecoScoreEl) animateValue(ecoScoreEl, 0, parseInt(ecoScore), 1200);
  if (badgesEl) animateValue(badgesEl, 0, parseInt(badges), 800);
}

function renderLeaderboard(data) {
  const container = document.getElementById('leaderboard-list');
  if (!container) return;

  const leaderboard = Array.isArray(data) ? data : (data && data.leaderboard ? data.leaderboard : []);

  if (leaderboard.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">👥</div>
        <h3>No leaderboard data</h3>
        <p>Start logging activities to appear on the leaderboard!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';

  leaderboard.forEach((user, index) => {
    const rank = index + 1;
    const item = createLeaderboardItem(user, rank);
    item.style.animationDelay = `${index * 0.06}s`;
    item.style.opacity = '0';
    item.classList.add('animate-stagger');
    container.appendChild(item);

    // Stagger animation
    setTimeout(() => {
      item.style.opacity = '1';
      item.style.transform = 'translateY(0)';
      item.style.transition = 'all 0.4s ease';
    }, index * 60);
  });
}

function createLeaderboardItem(user, rank) {
  const item = document.createElement('div');
  let rankClass = '';
  if (rank === 1) rankClass = 'rank-1';
  else if (rank === 2) rankClass = 'rank-2';
  else if (rank === 3) rankClass = 'rank-3';

  item.className = `leaderboard-item ${rankClass}`;
  item.style.transform = 'translateY(12px)';

  const displayName = escapeHTML(user.displayName || user.name || 'Anonymous');
  const ecoScore = user.ecoScore || user.score || 0;
  const badgesCount = user.badgesCount || user.badges || 0;
  const photoURL = user.photoURL || user.avatar || '';
  const initial = displayName.charAt(0).toUpperCase();

  let rankDisplay = rank.toString();
  if (rank === 1) rankDisplay = '🥇';
  else if (rank === 2) rankDisplay = '🥈';
  else if (rank === 3) rankDisplay = '🥉';

  const avatarContent = photoURL
    ? `<img src="${photoURL}" alt="${displayName}" onerror="this.style.display='none'; this.parentElement.querySelector('span') && (this.parentElement.querySelector('span').style.display='inline')">`
    : '';

  item.innerHTML = `
    <div class="leaderboard-rank">${rankDisplay}</div>
    <div class="leaderboard-avatar">
      ${avatarContent}
      <span ${photoURL ? 'style="display:none"' : ''}>${initial}</span>
    </div>
    <div class="leaderboard-name">${displayName}</div>
    <div class="leaderboard-score">${ecoScore} pts</div>
    <div class="leaderboard-badges-count">${badgesCount} 🏅</div>
  `;

  return item;
}
