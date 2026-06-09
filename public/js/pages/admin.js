/**
 * Admin Panel Module
 */

import api from '../api.js';
import { showToast } from '../utils/toast.js';
import { createConfirmDialog } from '../utils/helpers.js';

export async function init() {
  await loadStats();
  await loadUsers();
}

async function loadStats() {
  const result = await api.getAdminStats();
  if (result) {
    document.getElementById('admin-total-users').textContent = result.totalUsers || 0;
    document.getElementById('admin-total-activities').textContent = result.totalActivities || 0;
    document.getElementById('admin-total-co2').textContent = (result.totalCO2Saved || 0).toFixed(1) + ' kg';
  }
}

async function loadUsers() {
  const users = await api.getAdminUsers();
  const tbody = document.getElementById('admin-users-list');
  if (!tbody) return;

  if (!users || users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No users found</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  users.forEach(user => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${user.displayName || 'Unnamed'}</td>
      <td>${user.email}</td>
      <td>${user.ecoScore || 50}</td>
      <td>${user.currentStreak || 0} days</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="window.deleteUser('${user._id}', '${user.email}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Attach to window so inline onclick works
window.deleteUser = (userId, email) => {
  createConfirmDialog(
    'Delete User',
    `Are you sure you want to permanently delete user ${email} and all their activities?`,
    async () => {
      const result = await api.deleteAdminUser(userId);
      if (result) {
        showToast('User deleted successfully', 'success');
        loadStats();
        loadUsers();
      } else {
        showToast('Failed to delete user', 'error');
      }
    }
  );
};
