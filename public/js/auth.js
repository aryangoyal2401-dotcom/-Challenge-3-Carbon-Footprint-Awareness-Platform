/**
 * EcoTrack — Local JWT Authentication Module
 * Stores JWT token and user data in localStorage.
 * No Firebase dependency.
 */

const TOKEN_KEY = 'ecotrack_token';
const USER_KEY = 'ecotrack_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getCurrentUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function isAuthenticated() {
  return !!getToken();
}

function saveAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function login(email, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  saveAuth(data.data.token, data.data.user);
  return data.data.user;
}

export async function register(email, password, displayName) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  saveAuth(data.data.token, data.data.user);
  return data.data.user;
}

export function onAuthReady(callback) {
  // Check if we have a stored token and it's valid
  const token = getToken();
  const user = getCurrentUser();
  if (token && user) {
    // Verify token is still valid by calling profile endpoint
    fetch('/api/auth/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json()).then(data => {
      if (data.success) {
        // Update stored user data
        localStorage.setItem(USER_KEY, JSON.stringify(data.data));
        callback(data.data);
      } else {
        logout();
        callback(null);
      }
    }).catch(() => {
      // Network error - use cached user
      callback(user);
    });
  } else {
    callback(null);
  }
}
