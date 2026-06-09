/**
 * SPA Router Module
 * Handles page navigation without full page reloads
 */

const pages = {};
let currentPage = null;

export function registerPage(name, initFunction) {
  pages[name] = initFunction;
}

export function navigateTo(pageName) {
  if (!pages[pageName]) {
    console.warn(`Page "${pageName}" not registered`);
    return;
  }

  currentPage = pageName;

  // Update nav link active state
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    if (link.dataset.page === pageName) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Update page title in the top bar
  const pageTitle = document.getElementById('page-title');
  if (pageTitle) {
    const titles = {
      'dashboard': 'Dashboard',
      'log-activity': 'Log Activity',
      'insights': 'Insights',
      'challenges': 'Challenges',
      'leaderboard': 'Leaderboard',
      'settings': 'Settings'
    };
    pageTitle.textContent = titles[pageName] || pageName;
  }

  // Clear the page content container
  const pageContent = document.getElementById('page-content');
  if (!pageContent) return;
  pageContent.innerHTML = '';

  // Clone the template and insert
  const templateId = `tmpl-${pageName}`;
  const template = document.getElementById(templateId);
  if (template) {
    const clone = template.content.cloneNode(true);
    pageContent.appendChild(clone);
  }

  // Apply fade-in animation
  pageContent.classList.remove('animate-fade-in');
  void pageContent.offsetWidth;
  pageContent.classList.add('animate-fade-in');

  // Close mobile sidebar if open
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');

  // Scroll to top
  const mainContent = document.querySelector('.main-content');
  if (mainContent) mainContent.scrollTop = 0;

  // Call the page's init function
  try {
    pages[pageName]();
  } catch (error) {
    console.error(`Error initializing page "${pageName}":`, error);
  }
}

export function getCurrentPage() {
  return currentPage;
}
