/**
 * Settings Page Module
 */

import api from '../api.js';
import { showToast } from '../utils/toast.js';
import { createConfirmDialog } from '../utils/helpers.js';
import { getCurrentUser, logout } from '../auth.js';

export async function init() {
  populateUserInfo();
  await loadProfile();
  setupFormHandler();
  setupExportHandler();
  setupImportHandler();
  setupDeleteAccountHandler();
  setupChangeNameHandler();
  setupChangePasswordHandler();
}

function populateUserInfo() {
  const user = getCurrentUser();
  if (!user) return;

  const nameEl = document.getElementById('settings-display-name');
  const emailEl = document.getElementById('settings-email');
  const avatarText = document.getElementById('settings-avatar-text');
  const avatarImg = document.getElementById('settings-avatar-img');

  if (nameEl) nameEl.textContent = user.displayName || 'User';
  if (emailEl) emailEl.textContent = user.email || '';

  if (user.photoURL && avatarImg) {
    avatarImg.src = user.photoURL;
    avatarImg.classList.remove('hidden');
    if (avatarText) avatarText.style.display = 'none';
  } else if (avatarText) {
    avatarText.textContent = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
  }
}

async function loadProfile() {
  const result = await api.getProfile();
  if (!result) return;

  const profile = result.profile || result.preferences || result;

  const householdEl = document.getElementById('pref-household');
  const regionEl = document.getElementById('pref-region');
  const dietEl = document.getElementById('pref-diet');
  const transportEl = document.getElementById('pref-transport');
  const goalEl = document.getElementById('pref-goal');

  if (householdEl && profile.householdSize !== undefined) householdEl.value = profile.householdSize;
  if (regionEl && profile.region) regionEl.value = profile.region;
  if (dietEl && profile.dietType) dietEl.value = profile.dietType;
  if (transportEl && profile.primaryTransport) transportEl.value = profile.primaryTransport;
  if (goalEl && profile.monthlyGoal !== undefined) goalEl.value = profile.monthlyGoal;
}

function setupFormHandler() {
  const form = document.getElementById('settings-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const householdEl = document.getElementById('pref-household');
    const regionEl = document.getElementById('pref-region');
    const dietEl = document.getElementById('pref-diet');
    const transportEl = document.getElementById('pref-transport');
    const goalEl = document.getElementById('pref-goal');

    const data = {
      householdSize: householdEl ? parseInt(householdEl.value) || 1 : 1,
      region: regionEl ? regionEl.value : 'global',
      dietType: dietEl ? dietEl.value : 'omnivore',
      primaryTransport: transportEl ? transportEl.value : 'car',
      monthlyGoal: goalEl ? parseInt(goalEl.value) || 300 : 300
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Saving...';
    }

    const result = await api.updateProfile(data);

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        Save Preferences
      `;
    }

    if (result) {
      showToast('Preferences saved successfully!', 'success');
    }
  });
}

function setupExportHandler() {
  const exportBtn = document.getElementById('btn-export-data');
  if (!exportBtn) return;

  exportBtn.addEventListener('click', async () => {
    exportBtn.disabled = true;
    exportBtn.innerHTML = 'Exporting...';

    const result = await api.getActivities({ limit: 10000 });
    const activities = Array.isArray(result) ? result : (result && result.activities ? result.activities : []);

    const profileResult = await api.getProfile();

    const exportData = {
      exportDate: new Date().toISOString(),
      app: 'EcoTrack',
      profile: profileResult || {},
      activities,
      totalActivities: activities.length
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ecotrack-data.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    exportBtn.disabled = false;
    exportBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      Export Data (JSON)
    `;

    showToast(`Exported ${activities.length} activities`, 'success');
  });
}

function setupImportHandler() {
  const importBtn = document.getElementById('btn-import-data');
  const fileInput = document.getElementById('import-file-input');
  if (!importBtn || !fileInput) return;

  importBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const activities = data.activities || [];
      if (activities.length === 0) {
        showToast('No activities found in the file', 'warning');
        return;
      }

      let imported = 0;
      for (const activity of activities) {
        const result = await api.createActivity({
          category: activity.category,
          subCategory: activity.subCategory || activity.type,
          value: activity.value,
          unit: activity.unit,
          co2Amount: activity.co2Amount || activity.carbonKg,
          date: activity.date,
          notes: activity.notes || ''
        });
        if (result) imported++;
      }

      showToast(`Imported ${imported} of ${activities.length} activities`, 'success');
    } catch (error) {
      console.error('Import error:', error);
      showToast('Failed to import data. Check the file format.', 'error');
    }

    fileInput.value = '';
  });
}

function setupDeleteAccountHandler() {
  const deleteBtn = document.getElementById('btn-delete-account');
  if (!deleteBtn) return;

  deleteBtn.addEventListener('click', () => {
    createConfirmDialog(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted. Are you sure?',
      async () => {
        try {
          const result = await api.deleteAccount();
          if (result) {
            showToast('Account deleted. Goodbye! 🌿', 'info');
            logout();
            window.location.reload();
          }
        } catch (error) {
          console.error('Delete account error:', error);
          showToast('Failed to delete account. Please try again.', 'error');
        }
      }
    );
  });
}

function setupChangeNameHandler() {
  const btn = document.getElementById('btn-change-name');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const nameInput = document.getElementById('settings-new-name');
    const newName = nameInput?.value.trim();

    if (!newName) {
      showToast('Please enter a new name.', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Updating...';

    const result = await api.changeName({ displayName: newName });

    btn.disabled = false;
    btn.textContent = 'Update Name';

    if (result) {
      showToast('Name updated successfully!', 'success');
      // Update UI elements
      const sidebarName = document.getElementById('user-name');
      const settingsName = document.getElementById('settings-display-name');
      const avatarText = document.getElementById('user-avatar-text');
      if (sidebarName) sidebarName.textContent = newName;
      if (settingsName) settingsName.textContent = newName;
      if (avatarText) avatarText.textContent = newName.charAt(0).toUpperCase();
      nameInput.value = '';
    }
  });
}

function setupChangePasswordHandler() {
  const btn = document.getElementById('btn-change-password');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const currentPwInput = document.getElementById('settings-current-password');
    const newPwInput = document.getElementById('settings-new-password');
    const confirmPwInput = document.getElementById('settings-confirm-new-password');

    const currentPassword = currentPwInput?.value;
    const newPassword = newPwInput?.value;
    const confirmPassword = confirmPwInput?.value;

    if (!currentPassword || !newPassword) {
      showToast('Please fill in current and new password.', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Changing...';

    const result = await api.changePassword({ currentPassword, newPassword });

    btn.disabled = false;
    btn.textContent = 'Change Password';

    if (result) {
      showToast('Password changed successfully!', 'success');
      currentPwInput.value = '';
      newPwInput.value = '';
      confirmPwInput.value = '';
    }
  });
}
