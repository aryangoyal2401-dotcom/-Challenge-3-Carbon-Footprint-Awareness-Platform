/**
 * Log Activity Page Module
 */

import api from '../api.js';
import { showToast } from '../utils/toast.js';
import { formatRelativeDate, getCategoryIcon, getCategoryColor, getSubCategoryLabel, getUnitForCategory, getTodayDateString, debounce } from '../utils/helpers.js';

const EMISSION_FACTORS = {
  transportation: {
    car_gasoline: 0.21,
    car_diesel: 0.17,
    car_electric: 0.05,
    bus: 0.089,
    train: 0.041,
    subway: 0.033,
    bicycle: 0,
    walking: 0,
    motorcycle: 0.113,
    domestic_flight: 0.255,
    international_flight: 0.195,
    carpool: 0.105,
    electric_scooter: 0.025,
    car_hybrid: 0.12
  },
  food: {
    beef_meal: 7.0,
    lamb_meal: 5.0,
    pork_meal: 1.8,
    chicken_meal: 1.5,
    fish_meal: 1.2,
    vegetarian_meal: 0.5,
    vegan_meal: 0.3,
    dairy_heavy: 2.0
  },
  energy: {
    electricity_global: 0.45,
    electricity_india: 0.82,
    electricity_us: 0.38,
    electricity_eu: 0.28,
    electricity_uk: 0.21,
    natural_gas: 0.2,
    lpg: 0.23,
    heating_oil: 0.27,
    solar: 0.0,
    wind: 0.0
  },
  shopping: {
    electronics: 0.06,
    clothing_fast: 0.04,
    clothing_sustainable: 0.02,
    furniture: 0.03,
    general_goods: 0.025,
    groceries: 0.015
  }
};

const SUB_CATEGORIES = {
  transportation: ['car_gasoline', 'car_diesel', 'car_electric', 'bus', 'train', 'subway', 'bicycle', 'walking', 'motorcycle', 'domestic_flight', 'international_flight', 'carpool'],
  food: ['beef_meal', 'lamb_meal', 'pork_meal', 'chicken_meal', 'fish_meal', 'vegetarian_meal', 'vegan_meal', 'dairy_heavy'],
  energy: ['electricity_global', 'natural_gas', 'lpg', 'solar'],
  shopping: ['electronics', 'clothing_fast', 'clothing_sustainable', 'furniture', 'general_goods', 'groceries']
};

let selectedCategory = null;

export async function init() {
  setupCategoryCards();
  setupFormListeners();
  await loadActivityHistory();

  // Check for pre-selected category from dashboard quick actions
  if (window._preselectedCategory) {
    const category = window._preselectedCategory;
    window._preselectedCategory = null;
    selectCategory(category);
  }
}

function setupCategoryCards() {
  const cards = document.querySelectorAll('.category-card[data-category]');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const category = card.dataset.category;
      selectCategory(category);
    });
  });
}

function selectCategory(category) {
  selectedCategory = category;

  // Update UI active states
  const cards = document.querySelectorAll('.category-card[data-category]');
  cards.forEach(card => {
    if (card.dataset.category === category) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });

  // Show the form container
  const formContainer = document.getElementById('activity-form-container');
  if (formContainer) {
    formContainer.classList.remove('hidden');
    formContainer.classList.add('animate-fade-in-up');
  }

  // Update form title
  const titleEl = document.getElementById('form-category-title');
  if (titleEl) {
    const titles = {
      transportation: '🚗 Log Transportation',
      food: '🍽️ Log Food',
      energy: '⚡ Log Energy',
      shopping: '🛍️ Log Shopping'
    };
    titleEl.textContent = titles[category] || 'Log Activity';
  }

  // Populate subcategory dropdown
  const subSelect = document.getElementById('activity-subcategory');
  if (subSelect) {
    subSelect.innerHTML = '<option value="">Select type...</option>';
    const subCats = SUB_CATEGORIES[category] || [];
    subCats.forEach(sub => {
      const option = document.createElement('option');
      option.value = sub;
      option.textContent = getSubCategoryLabel(sub);
      subSelect.appendChild(option);
    });
  }

  // Update value label
  const valueLabel = document.getElementById('activity-value-label');
  if (valueLabel) {
    const labels = {
      transportation: 'Distance (km)',
      food: 'Number of Meals',
      energy: 'Amount (kWh)',
      shopping: 'Amount ($)'
    };
    valueLabel.textContent = labels[category] || 'Amount';
  }

  // Update value placeholder
  const valueInput = document.getElementById('activity-value');
  if (valueInput) {
    const placeholders = {
      transportation: 'Enter distance in km',
      food: 'Enter number of meals',
      energy: 'Enter kWh used',
      shopping: 'Enter amount in $'
    };
    valueInput.placeholder = placeholders[category] || 'Enter amount';
    valueInput.value = '';
  }

  // Set date to today
  const dateInput = document.getElementById('activity-date');
  if (dateInput) {
    dateInput.value = getTodayDateString();
  }

  // Clear notes
  const notesInput = document.getElementById('activity-notes');
  if (notesInput) {
    notesInput.value = '';
  }

  // Reset emission preview
  updateEmissionPreview();
}

function setupFormListeners() {
  const subSelect = document.getElementById('activity-subcategory');
  const valueInput = document.getElementById('activity-value');
  const form = document.getElementById('activity-form');

  const debouncedUpdate = debounce(updateEmissionPreview, 100);

  if (subSelect) {
    subSelect.addEventListener('change', debouncedUpdate);
  }
  if (valueInput) {
    valueInput.addEventListener('input', debouncedUpdate);
  }

  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
}

function updateEmissionPreview() {
  const amountEl = document.getElementById('emission-preview-amount');
  if (!amountEl) return;

  if (!selectedCategory) {
    amountEl.textContent = '0.00';
    return;
  }

  const subSelect = document.getElementById('activity-subcategory');
  const valueInput = document.getElementById('activity-value');

  const subCategory = subSelect ? subSelect.value : '';
  const value = valueInput ? parseFloat(valueInput.value) : 0;

  if (!subCategory || !value || value <= 0) {
    amountEl.textContent = '0.00';
    return;
  }

  const factor = (EMISSION_FACTORS[selectedCategory] && EMISSION_FACTORS[selectedCategory][subCategory]) || 0;
  const emission = factor * value;

  amountEl.textContent = emission.toFixed(2);
}

async function handleFormSubmit(e) {
  e.preventDefault();

  if (!selectedCategory) {
    showToast('Please select a category first', 'error');
    return;
  }

  const subSelect = document.getElementById('activity-subcategory');
  const valueInput = document.getElementById('activity-value');
  const dateInput = document.getElementById('activity-date');
  const notesInput = document.getElementById('activity-notes');

  const subCategory = subSelect ? subSelect.value : '';
  const value = valueInput ? parseFloat(valueInput.value) : 0;
  const date = dateInput ? dateInput.value : getTodayDateString();
  const notes = notesInput ? notesInput.value.trim() : '';

  if (!subCategory) {
    showToast('Please select a type', 'error');
    return;
  }

  if (!value || value <= 0) {
    showToast('Please enter a valid amount', 'error');
    return;
  }

  const factor = (EMISSION_FACTORS[selectedCategory] && EMISSION_FACTORS[selectedCategory][subCategory]) || 0;
  const co2Amount = factor * value;

  const activityData = {
    category: selectedCategory,
    subCategory,
    value,
    unit: getUnitForCategory(selectedCategory),
    co2Amount,
    date,
    notes
  };

  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Logging...</span>';
  }

  const result = await api.createActivity(activityData);

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
      Log Activity
    `;
  }

  if (result) {
    showToast(`Logged ${co2Amount.toFixed(1)} kg CO₂ from ${getSubCategoryLabel(subCategory)}`, 'success');

    // Reset form
    if (valueInput) valueInput.value = '';
    if (notesInput) notesInput.value = '';
    if (subSelect) subSelect.value = '';
    updateEmissionPreview();

    // Reload history
    await loadActivityHistory();
  }
}

async function loadActivityHistory() {
  const container = document.getElementById('activity-history');
  if (!container) return;

  const result = await api.getActivities({ limit: 20 });
  const activities = Array.isArray(result) ? result : (result && result.activities ? result.activities : []);

  if (activities.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <h3>No activities logged</h3>
        <p>Select a category above to start logging.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  activities.forEach((activity, index) => {
    const item = createActivityHistoryItem(activity);
    item.style.animationDelay = `${index * 0.05}s`;
    item.classList.add('animate-fade-in-up');
    container.appendChild(item);
  });
}

function createActivityHistoryItem(activity) {
  const item = document.createElement('div');
  item.className = 'activity-item';

  const category = activity.category || 'general';
  const icon = getCategoryIcon(category);
  const color = getCategoryColor(category);
  const subLabel = getSubCategoryLabel(activity.subCategory || activity.type || '');
  const co2 = parseFloat(activity.co2Amount || activity.carbonKg || 0);
  const id = activity._id || activity.id || '';

  item.innerHTML = `
    <div class="activity-icon" style="background: ${color}15; color: ${color};">
      ${icon}
    </div>
    <div class="activity-details">
      <div class="activity-name">${subLabel}</div>
      <div class="activity-meta">${formatRelativeDate(activity.date || activity.createdAt)} · ${activity.value || ''} ${activity.unit || ''}</div>
    </div>
    <div class="activity-co2">${co2.toFixed(1)} kg</div>
    <button class="activity-delete" data-id="${id}" title="Delete activity">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
      </svg>
    </button>
  `;

  const deleteBtn = item.querySelector('.activity-delete');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      const confirmed = confirm('Are you sure you want to delete this activity?');
      if (!confirmed) return;

      const result = await api.deleteActivity(id);
      if (result !== null) {
        item.style.opacity = '0';
        item.style.transform = 'translateX(20px)';
        item.style.transition = 'all 0.3s ease';
        setTimeout(() => {
          item.remove();
          const container = document.getElementById('activity-history');
          if (container && container.children.length === 0) {
            container.innerHTML = `
              <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <h3>No activities logged</h3>
                <p>Select a category above to start logging.</p>
              </div>
            `;
          }
        }, 300);
        showToast('Activity deleted', 'success');
      }
    });
  }

  return item;
}
