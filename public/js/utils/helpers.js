/**
 * Utility Helper Functions
 */

export function formatNumber(num, decimals = 1) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  const absNum = Math.abs(num);
  if (absNum >= 1000000) {
    return (num / 1000000).toFixed(decimals) + 'M';
  }
  if (absNum >= 1000) {
    return (num / 1000).toFixed(decimals) + 'K';
  }
  if (Number.isInteger(num)) {
    return num.toString();
  }
  return num.toFixed(decimals);
}

export function formatCO2(kg) {
  if (kg === null || kg === undefined || isNaN(kg)) return '0 kg';
  if (kg >= 1000) {
    return (kg / 1000).toFixed(1) + ' tonnes';
  }
  return kg.toFixed(1) + ' kg';
}

export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatRelativeDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((todayStart - dateStart) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return '1 month ago';
  return `${Math.floor(diffDays / 30)} months ago`;
}

export function animateValue(element, start, end, duration = 1000) {
  if (!element) return;
  const startTime = performance.now();
  const range = end - start;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = start + range * easeOut;

    if (end >= 100) {
      element.textContent = Math.round(current).toLocaleString();
    } else {
      element.textContent = current.toFixed(1);
    }

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      if (end >= 100) {
        element.textContent = Math.round(end).toLocaleString();
      } else {
        element.textContent = end % 1 === 0 ? end.toString() : end.toFixed(1);
      }
    }
  }

  requestAnimationFrame(update);
}

export function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function getCategoryColor(category) {
  const colors = {
    transportation: '#3b82f6',
    food: '#f59e0b',
    energy: '#8b5cf6',
    shopping: '#ec4899'
  };
  return colors[category] || '#10b981';
}

export function getCategoryIcon(category) {
  const icons = {
    transportation: '🚗',
    food: '🍽️',
    energy: '⚡',
    shopping: '🛍️'
  };
  return icons[category] || '📦';
}

export function getSubCategoryLabel(subCategory) {
  const labels = {
    car_gasoline: 'Gasoline Car',
    car_diesel: 'Diesel Car',
    car_electric: 'Electric Car',
    car_hybrid: 'Hybrid Car',
    bus: 'Bus',
    train: 'Train',
    subway: 'Subway',
    bicycle: 'Bicycle',
    walking: 'Walking',
    motorcycle: 'Motorcycle',
    domestic_flight: 'Domestic Flight',
    international_flight: 'International Flight',
    carpool: 'Carpool',
    electric_scooter: 'Electric Scooter',
    beef_meal: 'Beef Meal',
    lamb_meal: 'Lamb Meal',
    pork_meal: 'Pork Meal',
    chicken_meal: 'Chicken Meal',
    fish_meal: 'Fish Meal',
    vegetarian_meal: 'Vegetarian Meal',
    vegan_meal: 'Vegan Meal',
    dairy_heavy: 'Dairy Heavy',
    electricity_global: 'Electricity (Global)',
    electricity_india: 'Electricity (India)',
    electricity_us: 'Electricity (US)',
    electricity_eu: 'Electricity (EU)',
    electricity_uk: 'Electricity (UK)',
    natural_gas: 'Natural Gas',
    lpg: 'LPG',
    heating_oil: 'Heating Oil',
    solar: 'Solar',
    wind: 'Wind',
    electronics: 'Electronics',
    clothing_fast: 'Fast Fashion',
    clothing_sustainable: 'Sustainable Clothing',
    furniture: 'Furniture',
    general_goods: 'General Goods',
    groceries: 'Groceries'
  };
  return labels[subCategory] || subCategory.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function getUnitForCategory(category) {
  const units = {
    transportation: 'km',
    food: 'meals',
    energy: 'kWh',
    shopping: '$'
  };
  return units[category] || 'units';
}

export function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createConfirmDialog(title, message, onConfirm, onCancel) {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'confirm-dialog';

  const h3 = document.createElement('h3');
  h3.textContent = title;

  const p = document.createElement('p');
  p.textContent = message;

  const actions = document.createElement('div');
  actions.className = 'confirm-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => {
    overlay.remove();
    if (onCancel) onCancel();
  });

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'btn btn-danger';
  confirmBtn.textContent = 'Confirm';
  confirmBtn.addEventListener('click', () => {
    overlay.remove();
    if (onConfirm) onConfirm();
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(confirmBtn);
  dialog.appendChild(h3);
  dialog.appendChild(p);
  dialog.appendChild(actions);
  overlay.appendChild(dialog);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      if (onCancel) onCancel();
    }
  });

  document.body.appendChild(overlay);
}
