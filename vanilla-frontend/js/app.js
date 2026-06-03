const hostname = window.location.hostname || 'localhost';
const API_BASE = `http://${hostname}:8000`;
// Global State
const appState = {
  token: 'dummy-token',
  role: 'admin',
  username: 'admin',
  privacyMode: false,
};

// API Wrapper
const api = {
  async fetch(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (appState.token) {
      headers['Authorization'] = `Bearer ${appState.token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        app.logout();
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'API request failed');
      }

      return await response.json();
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  },
  
  async get(endpoint) {
    return this.fetch(endpoint);
  },

  async post(endpoint, data) {
    return this.fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async put(endpoint, data) {
    return this.fetch(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(endpoint) {
    return this.fetch(endpoint, {
      method: 'DELETE',
    });
  },
  
  async postForm(endpoint, formData) {
    const headers = {};
    if (appState.token) {
      headers['Authorization'] = `Bearer ${appState.token}`;
    }
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'API request failed');
    }
    return await response.json();
  }
};

// Application Logic
const app = {
  routes: {},
  
  init() {
    this.bindEvents();
    this.checkAuth();
    
    // Listen for hash changes for routing
    window.addEventListener('hashchange', () => this.handleRoute());
  },

  bindEvents() {
    // Privacy Toggle
    document.getElementById('btn-privacy-toggle').addEventListener('click', () => {
      const pinStr = localStorage.getItem('appPin') || '1234';
      const entered = window.prompt(`Enter PIN to ${appState.privacyMode ? 'Unmask' : 'Hide'} Financial Data\n(Default PIN is 1234 - Leave blank to cancel)`);
      if (entered === null || entered === "") return;
      if (entered === pinStr) {
        appState.privacyMode = !appState.privacyMode;
        this.updatePrivacyUI();
        this.handleRoute(); // Re-render current page
      } else {
        alert("Error: Incorrect PIN.");
      }
    });

    // Login and Logout logic removed

  },

  updatePrivacyUI() {
    const btn = document.getElementById('btn-privacy-toggle');
    if (appState.privacyMode) {
      btn.style.background = 'var(--accent-red)';
      btn.innerHTML = `<i data-lucide="eye-off"></i> <span>Unmask Fin. Data</span>`;
    } else {
      btn.style.background = 'var(--bg-secondary)';
      btn.innerHTML = `<i data-lucide="eye"></i> <span>Hide Fin. Data</span>`;
    }
    lucide.createIcons();
  },

  checkAuth() {
    // Auth check bypassed
    document.getElementById('nav-staff').style.display = 'flex';
    this.handleRoute();
  },

  logout() {
    alert("Logout is disabled since authentication is removed.");
  },

  handleRoute() {
    let hash = window.location.hash.substring(1) || 'dashboard';
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
      if (link.dataset.route === hash) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    const mainContent = document.getElementById('main-content');
    
    // Call page renderer
    if (this.routes[hash]) {
      this.routes[hash](mainContent);
    } else {
      mainContent.innerHTML = `<h2>404 - Page Not Found</h2>`;
    }
    
    lucide.createIcons();
  },
  
  // Helper to format currency
  formatCurrency(value) {
    if (appState.privacyMode) return '₹ ***.**';
    return `₹ ${parseFloat(value || 0).toFixed(2)}`;
  }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  app.init();
  lucide.createIcons();
});
