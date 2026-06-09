/**
 * Challenges Page Module
 */

import api from '../api.js';
import { showToast } from '../utils/toast.js';

const DEFAULT_BADGES = [
  { id: 'first_log', name: 'First Step', icon: '🌱', description: 'Log your first activity' },
  { id: 'week_streak', name: '7-Day Streak', icon: '🔥', description: 'Log activities for 7 days straight' },
  { id: 'month_streak', name: '30-Day Streak', icon: '⚡', description: 'Log activities for 30 days straight' },
  { id: 'low_carbon_day', name: 'Low Carbon Day', icon: '🍃', description: 'Keep daily emissions under 5 kg' },
  { id: 'green_commuter', name: 'Green Commuter', icon: '🚲', description: 'Use zero-emission transport 10 times' },
  { id: 'plant_powered', name: 'Plant Powered', icon: '🥬', description: 'Log 20 plant-based meals' },
  { id: 'energy_saver', name: 'Energy Saver', icon: '💡', description: 'Reduce energy usage by 20%' },
  { id: 'eco_warrior', name: 'Eco Warrior', icon: '🛡️', description: 'Complete 5 challenges' },
  { id: 'tree_hugger', name: 'Tree Hugger', icon: '🌳', description: 'Offset 100 kg CO₂' },
  { id: 'carbon_zero', name: 'Carbon Zero', icon: '🏆', description: 'Achieve net-zero for a month' },
  { id: 'social_impact', name: 'Social Impact', icon: '🤝', description: 'Inspire 3 friends to join' },
  { id: 'data_driven', name: 'Data Driven', icon: '📊', description: 'Log 100 activities' }
];

const DEFAULT_AVAILABLE_CHALLENGES = [
  {
    id: 'meatless_week',
    title: 'Meatless Week',
    description: 'Go meat-free for 7 days and save up to 30 kg CO₂',
    icon: '🥗',
    targetValue: 7,
    unit: 'days',
    reward: '50 eco points'
  },
  {
    id: 'bike_to_work',
    title: 'Bike to Work',
    description: 'Cycle to work or school 5 times this month',
    icon: '🚴',
    targetValue: 5,
    unit: 'rides',
    reward: '40 eco points'
  },
  {
    id: 'energy_detective',
    title: 'Energy Detective',
    description: 'Reduce your electricity usage by 15% this month',
    icon: '🔍',
    targetValue: 15,
    unit: '% reduction',
    reward: '60 eco points'
  },
  {
    id: 'zero_waste_week',
    title: 'Zero Waste Week',
    description: 'Avoid single-use items for a full week',
    icon: '♻️',
    targetValue: 7,
    unit: 'days',
    reward: '45 eco points'
  },
  {
    id: 'public_transport',
    title: 'Public Transit Pro',
    description: 'Use public transportation for all commutes this week',
    icon: '🚌',
    targetValue: 5,
    unit: 'trips',
    reward: '35 eco points'
  }
];

export async function init() {
  await loadChallengesData();
}

async function loadChallengesData() {
  const [activeResult, availableResult, badgesResult] = await Promise.all([
    api.getActiveChallenges(),
    api.getAvailableChallenges(),
    api.getBadges()
  ]);

  renderActiveChallenges(activeResult);
  renderAvailableChallenges(availableResult);
  renderBadges(badgesResult);
}

function renderActiveChallenges(data) {
  const container = document.getElementById('active-challenges');
  if (!container) return;

  const challenges = Array.isArray(data) ? data : (data && data.challenges ? data.challenges : []);

  if (challenges.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">🏆</div>
        <h3>No active challenges</h3>
        <p>Join a challenge below to get started!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  container.classList.add('grid-2');

  challenges.forEach((challenge, index) => {
    const card = createChallengeCard(challenge, true);
    card.style.animationDelay = `${index * 0.1}s`;
    container.appendChild(card);
  });
}

function renderAvailableChallenges(data) {
  const container = document.getElementById('available-challenges');
  if (!container) return;

  let challenges = Array.isArray(data) ? data : (data && data.challenges ? data.challenges : []);

  if (challenges.length === 0) {
    challenges = DEFAULT_AVAILABLE_CHALLENGES;
  }

  container.innerHTML = '';
  container.classList.add('grid-2');

  challenges.forEach((challenge, index) => {
    const card = createChallengeCard(challenge, false);
    card.style.animationDelay = `${index * 0.1}s`;
    container.appendChild(card);
  });
}

function createChallengeCard(challenge, isActive) {
  const card = document.createElement('div');
  const isCompleted = challenge.completed || (challenge.currentValue >= challenge.targetValue);
  card.className = `challenge-card glass-card animate-fade-in-up ${isCompleted ? 'challenge-completed' : ''}`;

  const currentValue = challenge.currentValue || 0;
  const targetValue = challenge.targetValue || 1;
  const progress = Math.min((currentValue / targetValue) * 100, 100);

  let footer = '';
  if (isActive) {
    footer = `
      <div class="challenge-progress">
        <div class="challenge-progress-text">
          <span>${currentValue} / ${targetValue} ${challenge.unit || 'units'}</span>
          <span>${Math.round(progress)}%</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${progress}%"></div>
        </div>
      </div>
    `;
  } else {
    footer = `
      <div class="challenge-footer mt-2">
        <button class="btn btn-primary btn-sm btn-join-challenge" data-challenge-id="${challenge.id || challenge._id}">
          Join Challenge
        </button>
        ${challenge.reward ? `<span class="text-secondary" style="font-size: 0.75rem; margin-left: 8px;">${challenge.reward}</span>` : ''}
      </div>
    `;
  }

  card.innerHTML = `
    <div class="challenge-card-header">
      <div class="challenge-icon">${challenge.icon || '🎯'}</div>
      <div class="challenge-info">
        <div class="challenge-title">${challenge.title || challenge.name || 'Challenge'}</div>
        <div class="challenge-description">${challenge.description || ''}</div>
      </div>
    </div>
    ${footer}
  `;

  // Attach join handler
  const joinBtn = card.querySelector('.btn-join-challenge');
  if (joinBtn) {
    joinBtn.addEventListener('click', async () => {
      const challengeId = joinBtn.dataset.challengeId;
      joinBtn.disabled = true;
      joinBtn.textContent = 'Joining...';

      const result = await api.joinChallenge(challengeId);

      if (result) {
        showToast(`Joined "${challenge.title || 'Challenge'}"!`, 'success');

        // Animate card transition
        card.style.transition = 'all 0.4s ease';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.95)';

        setTimeout(() => {
          card.remove();

          // Add to active challenges
          const activeContainer = document.getElementById('active-challenges');
          if (activeContainer) {
            // Remove empty state if present
            const emptyState = activeContainer.querySelector('.empty-state');
            if (emptyState) {
              activeContainer.innerHTML = '';
              activeContainer.classList.add('grid-2');
            }

            const activeChallenge = {
              ...challenge,
              currentValue: 0,
              targetValue: challenge.targetValue || 7
            };
            const newCard = createChallengeCard(activeChallenge, true);
            newCard.classList.add('animate-fade-in-up');
            activeContainer.appendChild(newCard);
          }

          // Check if available is now empty
          const availContainer = document.getElementById('available-challenges');
          if (availContainer && availContainer.children.length === 0) {
            availContainer.innerHTML = `
              <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">✅</div>
                <h3>All challenges joined!</h3>
                <p>You've joined all available challenges. Check back later for new ones.</p>
              </div>
            `;
          }
        }, 400);
      } else {
        joinBtn.disabled = false;
        joinBtn.textContent = 'Join Challenge';
      }
    });
  }

  return card;
}

function renderBadges(data) {
  const container = document.getElementById('badges-gallery');
  if (!container) return;

  const badgesData = data || {};
  const earned = badgesData.earned || badgesData.badges || [];
  const earnedIds = earned.map(b => b.id || b.badgeId || b);

  const allBadges = badgesData.all || DEFAULT_BADGES;

  container.innerHTML = '';

  allBadges.forEach((badge, index) => {
    const isEarned = earnedIds.includes(badge.id);
    const badgeEl = document.createElement('div');
    badgeEl.className = `badge-circle ${isEarned ? 'badge-earned' : 'badge-locked'}`;
    badgeEl.style.animationDelay = `${index * 0.05}s`;
    badgeEl.classList.add('animate-fade-in-up');

    badgeEl.innerHTML = `
      <div class="badge-icon-wrapper" title="${badge.description || badge.name}">
        ${badge.icon || '🏅'}
      </div>
      <span class="badge-label">${badge.name || 'Badge'}</span>
    `;

    container.appendChild(badgeEl);
  });
}
