/**
 * Toast Notification Utility
 * Shows stackable toast notifications with auto-dismiss
 */

const ICONS = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠'
};

const ICON_COLORS = {
  success: '#10b981',
  error: '#ef4444',
  info: '#06b6d4',
  warning: '#f59e0b'
};

export function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.textContent = ICONS[type] || ICONS.info;
  icon.style.color = ICON_COLORS[type] || ICON_COLORS.info;

  const msg = document.createElement('span');
  msg.className = 'toast-message';
  msg.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => removeToast(toast));

  toast.appendChild(icon);
  toast.appendChild(msg);
  toast.appendChild(closeBtn);

  container.appendChild(toast);

  const timeout = setTimeout(() => {
    removeToast(toast);
  }, duration);

  toast._timeout = timeout;
}

function removeToast(toast) {
  if (toast._removing) return;
  toast._removing = true;

  if (toast._timeout) {
    clearTimeout(toast._timeout);
  }

  toast.classList.add('removing');

  toast.addEventListener('animationend', () => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  });

  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 350);
}
