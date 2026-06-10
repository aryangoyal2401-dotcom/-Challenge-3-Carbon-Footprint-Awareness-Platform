/**
 * EcoTrack — Main Application Entry Point
 * ES Module that initializes auth, routing, and event handlers
 * Uses local JWT authentication (no Firebase)
 */

import { login, register, logout, onAuthReady } from './auth.js';
import { registerPage, navigateTo } from './router.js';
import { showToast } from './utils/toast.js';
import { getGreeting } from './utils/helpers.js';

import { init as initDashboard } from './pages/dashboard.js';
import { init as initLogActivity } from './pages/logActivity.js';
import { init as initInsights } from './pages/insights.js';
import { init as initChallenges } from './pages/challenges.js';
import { init as initLeaderboard } from './pages/leaderboard.js';
import { init as initSettings } from './pages/settings.js';
import { init as initAdmin } from './pages/admin.js';

// Register pages
registerPage('dashboard', initDashboard);
registerPage('log-activity', initLogActivity);
registerPage('insights', initInsights);
registerPage('challenges', initChallenges);
registerPage('leaderboard', initLeaderboard);
registerPage('settings', initSettings);
registerPage('admin', initAdmin);

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
const authConfirmPasswordInput = document.getElementById('auth-confirm-password');
const confirmPasswordField = document.getElementById('signup-confirm-password-field');
const passwordMatchMsg = document.getElementById('password-match-msg');
const passwordStrength = document.getElementById('password-strength');
const strengthFill = document.getElementById('strength-fill');
const strengthText = document.getElementById('strength-text');
const captchaContainer = document.getElementById('captcha-container');
const captchaCheckbox = document.getElementById('captcha-checkbox');
const captchaChallenge = document.getElementById('captcha-challenge');
const captchaQuestion = document.getElementById('captcha-question');
const captchaAnswer = document.getElementById('captcha-answer');
const captchaVerifyBtn = document.getElementById('captcha-verify-btn');
const captchaSuccess = document.getElementById('captcha-success');
const captchaLabel = document.getElementById('captcha-label');
const sidebarNavLinks = document.querySelectorAll('.nav-link[data-page]');
const btnSignout = document.getElementById('btn-signout');
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const greetingText = document.getElementById('greeting-text');

let isSignUpMode = false;
let captchaVerified = false;
let captchaTokenVal = null;

// ---------- Password strength checker ----------
function checkPasswordStrength(password) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score; // 0-5
}

function updateStrengthUI(password) {
  if (!passwordStrength || !strengthFill || !strengthText) return;
  const score = checkPasswordStrength(password);
  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981', '#059669'];
  const widths = ['5%', '20%', '40%', '60%', '80%', '100%'];
  strengthFill.style.width = widths[score];
  strengthFill.style.background = colors[score];
  strengthText.textContent = labels[score];
  strengthText.style.color = colors[score];
}

if (authPasswordInput) {
  authPasswordInput.addEventListener('input', () => {
    if (isSignUpMode) {
      updateStrengthUI(authPasswordInput.value);
      checkPasswordMatch();
    }
  });
}

function checkPasswordMatch() {
  if (!authConfirmPasswordInput || !passwordMatchMsg) return;
  const confirm = authConfirmPasswordInput.value;
  if (!confirm) { passwordMatchMsg.classList.add('hidden'); return; }
  if (authPasswordInput.value === confirm) {
    passwordMatchMsg.textContent = '✓ Passwords match';
    passwordMatchMsg.className = 'password-match-msg match-ok';
  } else {
    passwordMatchMsg.textContent = '✗ Passwords do not match';
    passwordMatchMsg.className = 'password-match-msg match-error';
  }
}

if (authConfirmPasswordInput) {
  authConfirmPasswordInput.addEventListener('input', checkPasswordMatch);
}

// ---------- CAPTCHA system ----------
// ---------- CAPTCHA system ----------
async function generateCaptcha() {
  if (captchaQuestion) captchaQuestion.textContent = 'Generating...';
  try {
    const res = await fetch('/api/auth/captcha');
    const data = await res.json();
    if (data.success) {
      captchaTokenVal = data.data.token;
      if (captchaQuestion) captchaQuestion.textContent = data.data.question;
    } else {
      if (captchaQuestion) captchaQuestion.textContent = 'Error. Click checkbox to retry.';
    }
  } catch {
    if (captchaQuestion) captchaQuestion.textContent = 'Network error. Click checkbox to retry.';
  }
}

if (captchaCheckbox) {
  captchaCheckbox.addEventListener('change', () => {
    if (captchaCheckbox.checked) {
      generateCaptcha();
      if (captchaChallenge) captchaChallenge.classList.remove('hidden');
      if (captchaAnswer) { captchaAnswer.value = ''; captchaAnswer.focus(); }
    } else {
      captchaVerified = false;
      captchaTokenVal = null;
      if (captchaChallenge) captchaChallenge.classList.add('hidden');
      if (captchaSuccess) captchaSuccess.classList.add('hidden');
      if (captchaLabel) captchaLabel.classList.remove('hidden');
    }
  });
}

if (captchaVerifyBtn) {
  captchaVerifyBtn.addEventListener('click', async () => {
    const userAnswer = parseInt(captchaAnswer?.value, 10);
    if (isNaN(userAnswer)) {
      showToast('Please enter a valid number.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/auth/verify-captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captchaAnswer: userAnswer, captchaToken: captchaTokenVal })
      });
      const data = await res.json();

      if (data.success) {
        captchaVerified = true;
        if (captchaChallenge) captchaChallenge.classList.add('hidden');
        if (captchaLabel) captchaLabel.classList.add('hidden');
        if (captchaSuccess) captchaSuccess.classList.remove('hidden');
        showToast('Verification successful ✓', 'success');
      } else {
        captchaVerified = false;
        showToast(data.error || 'Incorrect answer. Try again.', 'error');
        generateCaptcha();
        if (captchaAnswer) { captchaAnswer.value = ''; captchaAnswer.focus(); }
      }
    } catch {
      showToast('Network error during verification.', 'error');
    }
  });
}

if (captchaAnswer) {
  captchaAnswer.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); captchaVerifyBtn?.click(); }
  });
}

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

  const adminLink = document.getElementById('nav-link-admin');
  if (adminLink) {
    if (user.email === 'admin@ecotrack.com') {
      adminLink.classList.remove('hidden');
    } else {
      adminLink.classList.add('hidden');
    }
  }
}

function showLogin() {
  loginPage.classList.remove('hidden');
  appShell.classList.add('hidden');
  clearLoginForm();
}

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
  captchaVerified = false;
  if (isSignUpMode) {
    if (signupNameField) signupNameField.classList.remove('hidden');
    if (confirmPasswordField) confirmPasswordField.classList.remove('hidden');
    if (passwordStrength) passwordStrength.classList.remove('hidden');
    if (captchaContainer) captchaContainer.classList.remove('hidden');
    if (btnAuthSubmit) btnAuthSubmit.textContent = 'Sign Up';
    if (loginToggleText) loginToggleText.textContent = 'Already have an account?';
    if (loginToggleLink) loginToggleLink.textContent = 'Sign In';
    // Reset captcha state
    if (captchaCheckbox) captchaCheckbox.checked = false;
    if (captchaChallenge) captchaChallenge.classList.add('hidden');
    if (captchaSuccess) captchaSuccess.classList.add('hidden');
    if (captchaLabel) captchaLabel.classList.remove('hidden');
    updateStrengthUI('');
  } else {
    if (signupNameField) signupNameField.classList.add('hidden');
    if (confirmPasswordField) confirmPasswordField.classList.add('hidden');
    if (passwordStrength) passwordStrength.classList.add('hidden');
    if (captchaContainer) captchaContainer.classList.add('hidden');
    if (btnAuthSubmit) btnAuthSubmit.textContent = 'Sign In';
    if (loginToggleText) loginToggleText.textContent = "Don't have an account?";
    if (loginToggleLink) loginToggleLink.textContent = 'Sign Up';
    if (passwordMatchMsg) passwordMatchMsg.classList.add('hidden');
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

    if (isSignUpMode) {
      // Validate password strength
      if (checkPasswordStrength(password) < 2) {
        showLoginError('Password is too weak. Use at least 6 characters with a mix of letters and numbers.');
        return;
      }
      // Validate confirm password
      const confirmPassword = authConfirmPasswordInput?.value;
      if (password !== confirmPassword) {
        showLoginError('Passwords do not match.');
        return;
      }
      // Validate CAPTCHA
      if (!captchaVerified) {
        showLoginError('Please complete the "I am not a robot" verification.');
        return;
      }
    }

    if (btnAuthSubmit) { btnAuthSubmit.disabled = true; btnAuthSubmit.textContent = isSignUpMode ? 'Creating account...' : 'Signing in...'; }
    try {
      let user;
      if (isSignUpMode) {
        if (!name) { showLoginError('Please enter your name.'); if(btnAuthSubmit){btnAuthSubmit.disabled=false;btnAuthSubmit.textContent='Sign Up';} return; }
        user = await register(email, password, name, parseInt(captchaAnswer?.value, 10), captchaTokenVal);
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
  const isOpen = sidebar && sidebar.classList.toggle('open');
  if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
  mobileMenuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
});
if (sidebarOverlay) sidebarOverlay.addEventListener('click', () => {
  if (sidebar) sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
  if (mobileMenuToggle) mobileMenuToggle.setAttribute('aria-expanded', 'false');
});

// ---------- Forgot Password Flow ----------
const forgotPasswordLink = document.getElementById('forgot-password-link');
const forgotPasswordPanel = document.getElementById('forgot-password-panel');
const forgotBackLink = document.getElementById('forgot-back-link');
const forgotError = document.getElementById('forgot-error');
const btnForgotSend = document.getElementById('btn-forgot-send');
const btnForgotReset = document.getElementById('btn-forgot-reset');
const forgotStepEmail = document.getElementById('forgot-step-email');
const forgotStepReset = document.getElementById('forgot-step-reset');
const forgotCodeDisplay = document.getElementById('forgot-code-display');

let forgotEmail = '';

function showForgotError(msg) {
  if (forgotError) { forgotError.textContent = msg; forgotError.classList.remove('hidden'); }
}
function hideForgotError() {
  if (forgotError) { forgotError.classList.add('hidden'); forgotError.textContent = ''; }
}

if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    // Hide the login form containers, show forgot panel
    const allLoginContainers = document.querySelectorAll('#login-page .login-form-container');
    allLoginContainers.forEach(c => {
      if (c.id !== 'forgot-password-panel') c.classList.add('hidden');
    });
    if (forgotPasswordPanel) forgotPasswordPanel.classList.remove('hidden');
    if (forgotStepEmail) forgotStepEmail.classList.remove('hidden');
    if (forgotStepReset) forgotStepReset.classList.add('hidden');
    hideForgotError();
  });
}

if (forgotBackLink) {
  forgotBackLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (forgotPasswordPanel) forgotPasswordPanel.classList.add('hidden');
    // Show main login form containers back
    const allLoginContainers = document.querySelectorAll('#login-page .login-form-container');
    allLoginContainers.forEach(c => {
      if (c.id !== 'forgot-password-panel') c.classList.remove('hidden');
    });
    hideForgotError();
  });
}

if (btnForgotSend) {
  btnForgotSend.addEventListener('click', async () => {
    hideForgotError();
    const emailInput = document.getElementById('forgot-email');
    forgotEmail = emailInput?.value.trim();
    if (!forgotEmail) { showForgotError('Please enter your email.'); return; }

    btnForgotSend.disabled = true;
    btnForgotSend.textContent = 'Sending...';

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();

      if (data.success) {
        // Show step 2
        if (forgotStepEmail) forgotStepEmail.classList.add('hidden');
        if (forgotStepReset) forgotStepReset.classList.remove('hidden');

        if (forgotCodeDisplay) {
          forgotCodeDisplay.innerHTML = `<div class="reset-code-box">
            <span class="text-secondary">A reset code has been generated. Check the server console or contact your administrator.</span>
          </div>`;
        }

        showToast('Reset code generated! Check the server console.', 'success');
      } else {
        showForgotError(data.error || 'Failed to process request.');
      }
    } catch {
      showForgotError('Network error. Please try again.');
    }

    btnForgotSend.disabled = false;
    btnForgotSend.textContent = 'Send Reset Code';
  });
}

if (btnForgotReset) {
  btnForgotReset.addEventListener('click', async () => {
    hideForgotError();
    const codeInput = document.getElementById('forgot-code');
    const newPwInput = document.getElementById('forgot-new-password');
    const resetCode = codeInput?.value.trim();
    const newPassword = newPwInput?.value;

    if (!resetCode) { showForgotError('Please enter the reset code.'); return; }
    if (!newPassword || newPassword.length < 6) { showForgotError('New password must be at least 6 characters.'); return; }

    btnForgotReset.disabled = true;
    btnForgotReset.textContent = 'Resetting...';

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, resetCode, newPassword })
      });
      const data = await res.json();

      if (data.success) {
        showToast('Password reset successfully! You can now sign in.', 'success');
        // Go back to login
        forgotBackLink?.click();
      } else {
        showForgotError(data.error || 'Failed to reset password.');
      }
    } catch {
      showForgotError('Network error. Please try again.');
    }

    btnForgotReset.disabled = false;
    btnForgotReset.textContent = 'Reset Password';
  });
}
