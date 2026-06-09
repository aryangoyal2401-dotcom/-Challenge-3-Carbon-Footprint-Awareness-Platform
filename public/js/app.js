/**
 * EcoTrack — Main Application Entry Point
 * ES Module that initializes auth, routing, and event handlers
 * Uses local JWT authentication (no Firebase)
 */

import { login, register, logout, getToken, isAuthenticated, getCurrentUser, onAuthReady } from './auth.js';
import api from './api.js';
import { registerPage, navigateTo } from './router.js';
import { showToast } from './utils/toast.js';
import { getGreeting } from './utils/helpers.js';

import { init as initDashboard } from './pages/dashboard.js';
import { init as initLogActivity } from './pages/logActivity.js';
import { init as initInsights } from './pages/insights.js';
import { init as initChallenges } from './pages/challenges.js';
import { init as initLeaderboard } from './pages/leaderboard.js';
import { init as initSettings } from './pages/settings.js';

// Register pages
registerPage('dashboard', initDashboard);
registerPage('log-activity', initLogActivity);
registerPage('insights', initInsights);
registerPage('challenges', initChallenges);
registerPage('leaderboard', initLeaderboard);
registerPage('settings', initSettings);

// DOM elements
const loginPage = document.getElementById('login-page');
const appShell = document.getElementById('app-shell');
const loadingOverlay = document.getElementById('loading-overlay');
const loginForm = document.getElementById('login-form');
const btnAuthSubmit = document.getElementById('btn-auth-submit');
const loginToggleLink = document.getElementById('login-toggle-link');
const loginToggleText = document.getElementById('login-toggle-text');
const loginError = document.getElementById('login-error');
const signupNameField = document.getElementById('signup-name-field');
const authNameInput = document.getElementById('auth-name');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const sidebarNavLinks = document.querySelectorAll('.nav-link[data-page]');
const btnSignout = document.getElementById('btn-signout');
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const greetingText = document.getElementById('greeting-text');

let isSignUpMode = false;

// Check auth on load
onAuthReady(async (user) => {
  hideLoading();
  if (user) {
    showApp(user);
    navigateTo('dashboard');
  } else {
    showLogin();
  }
});

function showApp(user) {
  loginPage.classList.add('hidden');
  appShell.classList.remove('hidden');
  updateUserInfo(user);
  if (greetingText) greetingText.textContent = `${getGreeting()}, ${user.displayName || 'there'}! 🌿`;
}

function showLogin() {
  loginPage.classList.remove('hidden');
  appShell.classList.add('hidden');
  clearLoginForm();
}

function showLoading() { if (loadingOverlay) loadingOverlay.classList.remove('hidden'); }
function hideLoading() { if (loadingOverlay) loadingOverlay.classList.add('hidden'); }

function updateUserInfo(user) {
  const userNameEl = document.getElementById('user-name');
  const userAvatarText = document.getElementById('user-avatar-text');
  const userAvatarImg = document.getElementById('user-avatar-img');
  if (userNameEl) userNameEl.textContent = user.displayName || user.email || 'User';
  if (userAvatarText) {
    userAvatarText.textContent = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
    userAvatarText.style.display = '';
  }
  if (userAvatarImg) userAvatarImg.classList.add('hidden');
}

function showLoginError(msg) { if (loginError) { loginError.textContent = msg; loginError.classList.remove('hidden'); } }
function hideLoginError() { if (loginError) { loginError.classList.add('hidden'); loginError.textContent = ''; } }
function clearLoginForm() {
  if (authEmailInput) authEmailInput.value = '';
  if (authPasswordInput) authPasswordInput.value = '';
  if (authNameInput) authNameInput.value = '';
  hideLoginError();
}

function toggleSignUpMode() {
  isSignUpMode = !isSignUpMode;
  if (isSignUpMode) {
    if (signupNameField) signupNameField.classList.remove('hidden');
    if (btnAuthSubmit) btnAuthSubmit.textContent = 'Sign Up';
    if (loginToggleText) loginToggleText.textContent = 'Already have an account?';
    if (loginToggleLink) loginToggleLink.textContent = 'Sign In';
  } else {
    if (signupNameField) signupNameField.classList.add('hidden');
    if (btnAuthSubmit) btnAuthSubmit.textContent = 'Sign In';
    if (loginToggleText) loginToggleText.textContent = "Don't have an account?";
    if (loginToggleLink) loginToggleLink.textContent = 'Sign Up';
  }
  hideLoginError();
}

// Login form submit
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideLoginError();
    const email = authEmailInput?.value.trim();
    const password = authPasswordInput?.value;
    const name = authNameInput?.value.trim();
    if (!email || !password) { showLoginError('Please enter email and password.'); return; }
    if (btnAuthSubmit) { btnAuthSubmit.disabled = true; btnAuthSubmit.textContent = isSignUpMode ? 'Creating account...' : 'Signing in...'; }
    try {
      let user;
      if (isSignUpMode) {
        if (!name) { showLoginError('Please enter your name.'); if(btnAuthSubmit){btnAuthSubmit.disabled=false;btnAuthSubmit.textContent='Sign Up';} return; }
        user = await register(email, password, name);
        showToast('Account created! Welcome to EcoTrack 🌿', 'success');
      } else {
        user = await login(email, password);
        showToast('Welcome back! 🌿', 'success');
      }
      showApp(user);
      navigateTo('dashboard');
    } catch (error) {
      showLoginError(error.message || 'Authentication failed');
    }
    if (btnAuthSubmit) { btnAuthSubmit.disabled = false; btnAuthSubmit.textContent = isSignUpMode ? 'Sign Up' : 'Sign In'; }
  });
}

if (loginToggleLink) loginToggleLink.addEventListener('click', (e) => { e.preventDefault(); toggleSignUpMode(); });

// Sidebar nav
sidebarNavLinks.forEach(link => {
  link.addEventListener('click', (e) => { e.preventDefault(); const page = link.dataset.page; if (page) navigateTo(page); });
});

// Sign out
if (btnSignout) {
  btnSignout.addEventListener('click', () => {
    logout();
    showLogin();
    showToast('Signed out. See you soon! 🌿', 'info');
  });
}

// Mobile menu
if (mobileMenuToggle) mobileMenuToggle.addEventListener('click', () => {
  if (sidebar) sidebar.classList.toggle('open');
  if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
});
if (sidebarOverlay) sidebarOverlay.addEventListener('click', () => {
  if (sidebar) sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
});
