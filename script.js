/* =====================================================
   FINANCE CLARITY – COMPLETE FIXED SCRIPT.JS
   All functional issues fixed - Production ready
===================================================== */

(function () {
  'use strict';

  /* ================= UI UTILITIES (LEVEL-10 SAFE ADDITIONS) ================= */
  // Toasts: JS-driven (no HTML changes required)
  window.FCToast = window.FCToast || (function () {
    let container = null;
    function ensureContainer() {
      if (container) return container;
      container = document.getElementById('fc-toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'fc-toast-container';
        container.style.position = 'fixed';
        container.style.right = '16px';
        container.style.bottom = '16px';
        container.style.zIndex = '99999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        container.style.pointerEvents = 'none';
        document.body.appendChild(container);
      }
      return container;
    }
    function show(message, type) {
      try {
        const c = ensureContainer();
        const t = document.createElement('div');
        t.setAttribute('role', 'status');
        t.style.pointerEvents = 'auto';
        t.style.padding = '12px 14px';
        t.style.borderRadius = '10px';
        t.style.border = '1px solid rgba(255,255,255,0.12)';
        t.style.background = 'rgba(20,20,20,0.92)';
        t.style.color = '#fff';
        t.style.maxWidth = '340px';
        t.style.fontSize = '13px';
        t.style.lineHeight = '1.35';
        t.style.boxShadow = '0 12px 28px rgba(0,0,0,0.35)';
        t.style.opacity = '0';
        t.style.transform = 'translateY(6px)';
        t.style.transition = 'opacity 160ms ease, transform 160ms ease';
        if (type === 'success') t.style.borderColor = 'rgba(76, 175, 80, 0.55)';
        if (type === 'error') t.style.borderColor = 'rgba(255, 71, 87, 0.6)';
        t.textContent = String(message || '');
        c.appendChild(t);
        requestAnimationFrame(() => {
          t.style.opacity = '1';
          t.style.transform = 'translateY(0)';
        });
        setTimeout(() => {
          t.style.opacity = '0';
          t.style.transform = 'translateY(6px)';
          setTimeout(() => {
            try { t.remove(); } catch (e) {}
          }, 180);
        }, 2600);
      } catch (e) {
        // Never crash app for toasts
      }
    }
    return {
      success: (m) => show(m, 'success'),
      error: (m) => show(m, 'error'),
      info: (m) => show(m, 'info')
    };
  })();

  // Basic error boundary: keep app running + provide graceful feedback
  if (!window.__fcGlobalErrorsInstalled) {
    window.__fcGlobalErrorsInstalled = true;
    window.addEventListener('error', (ev) => {
      try {
        // Avoid noise for missing favicon.ico
        const msg = (ev && ev.message) ? String(ev.message) : '';
        const src = (ev && ev.filename) ? String(ev.filename) : '';
        if (msg.includes('favicon.ico') || src.includes('favicon.ico')) return;
        console.error('Global error:', ev.error || ev);
      } catch (e) {}
    });
    window.addEventListener('unhandledrejection', (ev) => {
      try {
        console.error('Unhandled promise rejection:', ev.reason || ev);
      } catch (e) {}
    });
  }

  /* ================= DATA MANAGER ================= */
  // Complete implementation with all required methods

  window.DataManager = {
    // Get user-specific localStorage keys
    _getUserKeys(userId) {
      const uid = userId || 'guest';
      return {
        INCOME: `finance_income_${uid}`,
        EXPENSES: `finance_expenses_${uid}`,
        FLEXIBLE: `finance_flexible_${uid}`,
        HISTORY: `finance_history_${uid}`
      };
    },

    // Legacy KEYS for backward compatibility (will be replaced by user-specific keys)
    get KEYS() {
      const userId = (typeof AuthManager !== 'undefined' && AuthManager.currentUser && AuthManager.currentUser.uid) ? AuthManager.currentUser.uid : 'guest';
      return this._getUserKeys(userId);
    },

    // Initialize data from localStorage (user-specific)
    _initData() {
      // Only load if authenticated
      if (typeof AuthManager === 'undefined' || !AuthManager.isAuthenticated() || !AuthManager.currentUser) {
        this._resetData();
        return;
      }

      const userId = AuthManager.currentUser.uid;
      const userKeys = this._getUserKeys(userId);
      
      try {
        this.income = JSON.parse(localStorage.getItem(userKeys.INCOME)) || [];
        this.expenses = JSON.parse(localStorage.getItem(userKeys.EXPENSES)) || [];
        this.flexibleSpending = JSON.parse(localStorage.getItem(userKeys.FLEXIBLE)) || { food: 0, travel: 0, shopping: 0, miscellaneous: 0 };
        this.HISTORY = JSON.parse(localStorage.getItem(userKeys.HISTORY)) || [];
      } catch (e) {
        this._resetData();
      }
    },

    // Reset all data to empty state
    _resetData() {
      this.income = [];
      this.expenses = [];
      this.flexibleSpending = { food: 0, travel: 0, shopping: 0, miscellaneous: 0 };
      this.HISTORY = [];
    },

    // Clear all user data (for sign-out)
    clearAllUserData(userId) {
      if (userId) {
        const userKeys = this._getUserKeys(userId);
        Object.values(userKeys).forEach(key => {
          try {
            localStorage.removeItem(key);
          } catch (e) {}
        });
      }
      this._resetData();
    },

    // Save to localStorage (user-specific) and sync to Firestore
    _save(key, data) {
      // Only save if authenticated
      if (typeof AuthManager === 'undefined' || !AuthManager.isAuthenticated() || !AuthManager.currentUser) {
        return;
      }

      const userId = AuthManager.currentUser.uid;
      const userKeys = this._getUserKeys(userId);
      
      try {
        localStorage.setItem(userKeys[key], JSON.stringify(data));
        
        // Sync to Firestore
        this._syncToFirestore();
      } catch (e) {
        console.warn('Failed to save to localStorage:', e);
      }
    },

    // Sync all finance data to Firestore
    _syncToFirestore() {
      if (typeof AuthManager === 'undefined' || !AuthManager.isAuthenticated() || !AuthManager.currentUser || !AuthManager.currentUser.uid) {
        return;
      }
      // Guard: never sync before Firebase is ready (prevents race-condition errors)
      if (typeof AuthManager.isFirebaseReady === 'function' && !AuthManager.isFirebaseReady()) {
        return;
      }

      // Debounce Firestore sync to avoid excessive writes
      if (this._syncTimeout) {
        clearTimeout(this._syncTimeout);
      }
      
      this._syncTimeout = setTimeout(() => {
        try {
          const financeData = {
            income: Array.isArray(this.income) ? this.income : [],
            fixedExpenses: Array.isArray(this.expenses) ? this.expenses : [],
            flexibleSpending: this.flexibleSpending || { food: 0, travel: 0, shopping: 0, miscellaneous: 0 }
          };

          // Performance: skip sync if payload is identical to last sync
          try {
            const payload = JSON.stringify(financeData);
            if (this._lastSyncPayload === payload) {
              return;
            }
            this._lastSyncPayload = payload;
          } catch (e) {
            // If serialization fails, continue with sync attempt
          }

          if (typeof AuthManager.saveUserData === 'function') {
            AuthManager.saveUserData(financeData).catch(err => {
              if (err && err.message && !err.message.includes('permission')) {
                console.warn('Firestore sync failed:', err.message);
              }
            });
          }
        } catch (e) {
          console.warn('Failed to sync to Firestore:', e);
        }
      }, 500);
    },

    // Generate unique ID
    _generateId() {
      return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /* ---------- INCOME METHODS ---------- */
    addIncomeSource({ name, amount }) {
      if (typeof AuthManager === 'undefined' || !AuthManager.isAuthenticated() || !AuthManager.currentUser || !AuthManager.currentUser.uid) {
        return;
      }
      if (!name || !amount || parseFloat(amount) <= 0) return;
      
      const id = this._generateId();
      const entry = {
        id,
        name: name.trim(),
        amount: parseFloat(amount),
        timestamp: new Date().toISOString()
      };
      
      this.income.push(entry);
      this._save('INCOME', this.income);
      
      // Add to history
      this.addHistoryEntry({
        type: 'income',
        category: name,
        action: 'Added',
        amount: parseFloat(amount),
        name: name
      });
      
      // Trigger recent activity update
      if (typeof window.renderRecentActivity === 'function') {
        setTimeout(() => window.renderRecentActivity(), 50);
      }
      
      return entry;
    },

    deleteIncomeSource(id) {
      if (typeof AuthManager === 'undefined' || !AuthManager.isAuthenticated() || !AuthManager.currentUser || !AuthManager.currentUser.uid) {
        return;
      }
      const index = this.income.findIndex(item => item.id === id);
      if (index === -1) return;
      
      const item = this.income[index];
      this.income.splice(index, 1);
      this._save('INCOME', this.income);
      
      // Add to history
      this.addHistoryEntry({
        type: 'income',
        category: item.name,
        action: 'Deleted',
        amount: item.amount,
        name: item.name
      });
      
      // Trigger recent activity update
      if (typeof window.renderRecentActivity === 'function') {
        setTimeout(() => window.renderRecentActivity(), 50);
      }
    },

    getIncome() {
      return Array.isArray(this.income) ? [...this.income] : [];
    },

    getTotalIncome() {
      return this.getIncome().reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    },

    /* ---------- EXPENSE METHODS ---------- */
    addFixedExpense({ name, amount }) {
      if (typeof AuthManager === 'undefined' || !AuthManager.isAuthenticated() || !AuthManager.currentUser || !AuthManager.currentUser.uid) {
        return;
      }
      if (!name || !amount || parseFloat(amount) <= 0) return;
      
      const id = this._generateId();
      const entry = {
        id,
        name: name.trim(),
        amount: parseFloat(amount),
        category: 'fixed',
        timestamp: new Date().toISOString()
      };
      
      this.expenses.push(entry);
      this._save('EXPENSES', this.expenses);
      
      // Add to history
      this.addHistoryEntry({
        type: 'expense',
        category: name,
        action: 'Added',
        amount: parseFloat(amount),
        name: name
      });
      
      // Trigger recent activity update
      if (typeof window.renderRecentActivity === 'function') {
        setTimeout(() => window.renderRecentActivity(), 50);
      }
      
      return entry;
    },

    deleteFixedExpense(id) {
      if (typeof AuthManager === 'undefined' || !AuthManager.isAuthenticated() || !AuthManager.currentUser || !AuthManager.currentUser.uid) {
        return;
      }
      const index = this.expenses.findIndex(item => item.id === id);
      if (index === -1) return;
      
      const item = this.expenses[index];
      this.expenses.splice(index, 1);
      this._save('EXPENSES', this.expenses);
      
      // Add to history
      this.addHistoryEntry({
        type: 'expense',
        category: item.name,
        action: 'Deleted',
        amount: item.amount,
        name: item.name
      });
      
      // Trigger recent activity update
      if (typeof window.renderRecentActivity === 'function') {
        setTimeout(() => window.renderRecentActivity(), 50);
      }
    },

    getFixedExpenses() {
      return Array.isArray(this.expenses) 
        ? this.expenses.filter(e => e.category === 'fixed' || !e.category)
        : [];
    },

    getTotalFixedExpenses() {
      return this.getFixedExpenses().reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    },

    getExpenses() {
      return Array.isArray(this.expenses) ? [...this.expenses] : [];
    },

    getTotalExpenses() {
      const fixed = this.getTotalFixedExpenses();
      const flexible = this.getTotalFlexibleSpending();
      return fixed + flexible;
    },

    /* ---------- FLEXIBLE SPENDING METHODS ---------- */
    updateFlexibleSpending(category, amount) {
      if (typeof AuthManager === 'undefined' || !AuthManager.isAuthenticated() || !AuthManager.currentUser || !AuthManager.currentUser.uid) {
        return;
      }
      const categories = ['food', 'travel', 'shopping', 'miscellaneous'];
      if (!categories.includes(category)) return;
      
      const oldAmount = this.flexibleSpending[category] || 0;
      const newAmount = parseFloat(amount) || 0;
      
      this.flexibleSpending[category] = newAmount;
      this._save('FLEXIBLE', this.flexibleSpending);
      
      // Add to history if amount changed
      if (oldAmount !== newAmount && newAmount > 0) {
        const categoryNames = {
          food: 'Food & Dining',
          travel: 'Travel & Transport',
          shopping: 'Shopping',
          miscellaneous: 'Miscellaneous'
        };
        
        this.addHistoryEntry({
          type: 'expense',
          category: categoryNames[category] || category,
          action: 'Updated',
          amount: newAmount,
          name: categoryNames[category] || category
        });
        
        // Trigger recent activity update
        if (typeof window.renderRecentActivity === 'function') {
          setTimeout(() => window.renderRecentActivity(), 50);
        }
      }
    },

    getFlexibleSpending() {
      return this.flexibleSpending || { food: 0, travel: 0, shopping: 0, miscellaneous: 0 };
    },

    getTotalFlexibleSpending() {
      const spending = this.getFlexibleSpending();
      return (parseFloat(spending.food) || 0) +
             (parseFloat(spending.travel) || 0) +
             (parseFloat(spending.shopping) || 0) +
             (parseFloat(spending.miscellaneous) || 0);
    },

    /* ---------- HISTORY METHODS ---------- */
    addHistoryEntry(entry) {
      // Only add if authenticated
      if (typeof AuthManager === 'undefined' || !AuthManager.isAuthenticated() || !AuthManager.currentUser || !AuthManager.currentUser.uid) {
        return;
      }

      if (!this.HISTORY) this.HISTORY = [];
      
      const historyEntry = {
        ...entry,
        id: entry.id || this._generateId(),
        timestamp: entry.timestamp || new Date().toISOString(),
        dateTime: entry.dateTime || new Date().toISOString()
      };
      
      this.HISTORY.push(historyEntry);
      this._save('HISTORY', this.HISTORY);
      
      // Save to Firestore if authenticated
      if (typeof AuthManager !== 'undefined' && AuthManager.isAuthenticated() && AuthManager.currentUser && AuthManager.currentUser.uid) {
        if (typeof AuthManager.saveHistoryEntry === 'function') {
          AuthManager.saveHistoryEntry(historyEntry).catch(err => {
            if (err && err.message && !err.message.includes('permission')) {
              console.warn('Firestore save failed:', err.message);
            }
          });
        }
      }
    },

    getHistory() {
      if (!Array.isArray(this.HISTORY)) this.HISTORY = [];
      return [...this.HISTORY].reverse(); // Most recent first
    },

    clearHistory() {
      this.HISTORY = [];
      this._save('HISTORY', this.HISTORY);
    },

    /* ---------- CALCULATIONS ---------- */
    calculateSavings() {
      return this.getTotalIncome() - this.getTotalExpenses();
    },

    /* ---------- RESET ---------- */
    resetAllData() {
      this.income = [];
      this.expenses = [];
      this.flexibleSpending = { food: 0, travel: 0, shopping: 0, miscellaneous: 0 };
      this.HISTORY = [];
      
      Object.keys(this.KEYS).forEach(key => {
        try {
          localStorage.removeItem(this.KEYS[key]);
        } catch (e) {}
      });
    },

    // Legacy methods for backward compatibility
    addIncome(amount, source = "Income") {
      return this.addIncomeSource({ name: source, amount });
    },

    addExpense(amount, label = "Expense", category = "fixed") {
      if (category === "flexible") {
        // Map to flexible spending
        const flexibleMap = { food: 'food', travel: 'travel', shopping: 'shopping', misc: 'miscellaneous' };
        const cat = flexibleMap[label.toLowerCase()] || 'miscellaneous';
        this.updateFlexibleSpending(cat, amount);
        return;
      }
      return this.addFixedExpense({ name: label, amount });
    }
  };

  // Initialize data on load
  DataManager._initData();

  /* ================= RECENT ACTIVITY ================= */

  window.renderRecentActivity = function () {
    try {
      const container = document.getElementById('recent-activity-container');
      const list = document.getElementById('recent-activity-list');
      
      // Support both container and list IDs
      const targetElement = list || container;
      if (!targetElement) return;

      if (!window.DataManager || typeof DataManager.getHistory !== 'function') {
        return;
      }

      const history = DataManager.getHistory();
      const recentItems = history.slice(0, 6);

      if (recentItems.length === 0) {
        const html = container ? 
          '<div class="empty-state" style="padding: 40px 20px;"><div class="empty-icon">📋</div><p style="font-size: 14px; color: var(--text-secondary);">No recent activity</p></div>' :
          '<p>No recent activity</p>';
        targetElement.innerHTML = html;
        return;
      }

      const itemsHtml = recentItems.map(item => {
        const type = item.type || 'expense';
        const sign = type === 'income' || type === 'savings' ? '+' : '−';
        const amount = parseFloat(item.amount) || 0;
        const name = item.name || item.category || 'Unknown';
        const date = item.dateTime || item.timestamp || new Date().toISOString();
        
        return `
          <div class="activity-item">
            <div class="activity-item-left">
              <div class="activity-icon-small ${type}">${type === 'income' ? '💰' : type === 'savings' ? '💵' : '💸'}</div>
              <div class="activity-details">
                <div class="activity-category">${escapeHtml(name)}</div>
                <div class="activity-action">${escapeHtml(item.action || '')}</div>
              </div>
            </div>
            <div class="activity-item-right">
              <div class="activity-amount ${type === 'income' || type === 'savings' ? 'positive' : 'negative'}">${sign}₹${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div class="activity-date">${formatShortDate(date)}</div>
            </div>
          </div>
        `;
      }).join('');

      if (container) {
        container.innerHTML = itemsHtml;
      } else if (list) {
        list.innerHTML = itemsHtml;
      }
    } catch (e) {
      console.warn('Recent activity render error:', e);
    }
  };

  // Helper function for date formatting
  function formatShortDate(dateStr) {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      return 'Recently';
    }
  }

  // Helper function for HTML escaping
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  /* ================= CHART MANAGER WRAPPER ================= */

  window.SafeChartManager = {
    updateAllCharts() {
      if (typeof ChartManager === 'undefined' || !ChartManager || typeof ChartManager.updateAllCharts !== 'function') {
        return;
      }
      try {
        ChartManager.updateAllCharts();
      } catch (e) {
        console.warn('Chart update skipped:', e.message);
      }
    }
  };

  /* ================= AFFORDABILITY CHECK ================= */

  // FIX: Ensure savings is defined
const savingsElement = document.querySelector('[data-savings]');
const savings = savingsElement
  ? parseFloat(savingsElement.textContent.replace(/[₹,]/g, '')) || 0
  : 0;
  window.checkAffordability = function () {
    try {
      // Verify user is authenticated
      if (typeof AuthManager === 'undefined' || !AuthManager.isAuthenticated() || !AuthManager.currentUser) {
        return;
      }
      // Guard: prevent any action until Firebase/Auth are ready (no premature execution)
      if (typeof AuthManager.isFirebaseReady === 'function' && !AuthManager.isFirebaseReady()) {
        return;
      }

      const input = document.getElementById('purchase-amount');
      const resultEl = document.getElementById('affordability-result');
      
      if (!input || !resultEl) return;

      const amount = parseFloat(input.value) || 0;
      if (amount <= 0) {
        resultEl.innerHTML = '<div class="affordability-result-box" style="background: rgba(255, 71, 87, 0.1); border-color: var(--accent-red); color: var(--accent-red); padding: 16px; border-radius: 8px; text-align: center;">Please enter a valid amount</div>';
        return;
      }

      if (!window.DataManager) return;
      
      // Ensure DataManager is initialized for current user
      if (typeof DataManager._initData === 'function') {
        DataManager._initData();
      }
      
      // Ensure savings is always defined (read from DOM, default to 0)
      const savingsElement = document.querySelector('[data-savings]');
      let savings = 0;
      if (savingsElement && typeof savingsElement.textContent === 'string') {
        const raw = savingsElement.textContent.replace(/[₹,\s]/g, '');
        const parsed = parseFloat(raw);
        if (!isNaN(parsed)) savings = parsed;
      }

      const income = DataManager.getTotalIncome ? DataManager.getTotalIncome() : 0;
      const fixedExpenses = DataManager.getTotalFixedExpenses ? DataManager.getTotalFixedExpenses() : 0;
      const flexibleSpending = DataManager.getTotalFlexibleSpending ? DataManager.getTotalFlexibleSpending() : 0;
      const totalExpenses = DataManager.getTotalExpenses ? DataManager.getTotalExpenses() : 0;

      // One-time affordability ONLY (Monthly option removed)
      const availableSavings = Math.max(0, income - totalExpenses);

      let availableAmount = availableSavings;
      let amountLabel = 'Available Savings';
      let resultClass = 'result-risky';
      let resultText = 'Risky';
      let resultMessage = '';

      if (availableAmount === 0) {
        resultClass = 'result-difficult';
        resultText = 'Cannot Afford';
        resultMessage = 'You have no available savings.';
      } else if (amount <= availableAmount * 0.3) {
        resultClass = 'result-safe';
        resultText = 'Safe to Purchase';
        resultMessage = `This purchase represents ${((amount / availableAmount) * 100).toFixed(1)}% of your available savings.`;
      } else if (amount <= availableAmount * 0.6) {
        resultClass = 'result-risky';
        resultText = 'Risky Purchase';
        resultMessage = `This purchase represents ${((amount / availableAmount) * 100).toFixed(1)}% of your available savings. Consider if this is essential.`;
      } else {
        resultClass = 'result-difficult';
        resultText = 'Difficult to Afford';
        resultMessage = `This purchase represents ${((amount / availableAmount) * 100).toFixed(1)}% of your available savings. You may need to adjust your budget.`;
      }

      if (income - totalExpenses < 0) {
        resultClass = 'result-difficult';
        resultText = 'Cannot Afford';
        resultMessage = `You are currently overspending by ₹${Math.abs(income - totalExpenses).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
      }

      let borderColor = '';
      if (resultClass === 'result-difficult') {
        borderColor = 'border-color: #ff6b6b; color: #ffcccc;';
      }

      // Generate AI-powered explanation if AI insights service is available
      let aiExplanation = '';
      const statusKey = resultClass === 'result-safe' ? 'safe' : 
                       resultClass === 'result-risky' ? 'risky' : 
                       resultClass === 'result-difficult' ? (savings < 0 ? 'cannot-afford' : 'difficult') : 'difficult';
      
      if (typeof window.AIFinancialInsights !== 'undefined' && typeof window.AIFinancialInsights.generateAffordabilityExplanation === 'function') {
        try {
          // For AI explanation, use availableAmount (which is correct for the purchase type)
          aiExplanation = window.AIFinancialInsights.generateAffordabilityExplanation(
            amount, 
            statusKey, 
            availableAmount, 
            income, 
            totalExpenses
          );
        } catch (e) {
          console.warn('AI insight generation failed:', e);
        }
      }
      
      resultEl.innerHTML = `
        <div class="affordability-result-box ${resultClass}" style="padding: 20px; border-radius: 12px; text-align: center; border: 2px solid; ${borderColor}">
          <h3 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700;">${resultText}</h3>
          <p style="margin: 0; font-size: 14px; opacity: 0.9;">${resultMessage}</p>
          ${aiExplanation ? `<p style="margin: 12px 0 0 0; font-size: 13px; opacity: 0.85; font-style: italic; line-height: 1.5;">${aiExplanation}</p>` : ''}
          <p style="margin: ${aiExplanation ? '8px' : '12px'} 0 0 0; font-size: 12px; opacity: 0.7;">${amountLabel}: ₹${availableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      `;
      
      // Add to history
      if (window.DataManager && typeof DataManager.addHistoryEntry === 'function') {
        DataManager.addHistoryEntry({
          type: 'expense',
          category: 'Affordability Check',
          action: `Checked: ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} - ${resultText}`,
          amount: amount,
          name: 'Affordability Check'
        });
        
        // Trigger recent activity update
        if (typeof window.renderRecentActivity === 'function') {
          setTimeout(() => window.renderRecentActivity(), 50);
        }
      }
    } catch (e) {
      console.warn('Affordability check error:', e);
    }
  };

  window.selectPurchaseType = function (type) {
    window.selectedPurchaseType = type || 'one-time';
    document.querySelectorAll('.purchase-type-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    const targetBtn = document.querySelector(`[data-type="${type}"]`);
    if (targetBtn) targetBtn.classList.add('active');
  };

  /* ================= NAVIGATION ================= */

  window.showSection = function (id) {
    try {
      if (!window._pageSections) window._pageSections = document.querySelectorAll('.page-section');
      
      requestAnimationFrame(() => {
        window._pageSections.forEach(sec => {
          if (sec.style.display !== 'none') {
            sec.style.display = 'none';
          }
        });

        const target = document.getElementById(id);
        if (target) {
          target.style.display = 'block';
          requestAnimationFrame(() => {
            if (window.SafeChartManager && typeof window.SafeChartManager.updateAllCharts === 'function') {
              window.SafeChartManager.updateAllCharts();
            }
          });
        }
      });
    } catch (e) {
      console.warn('showSection error:', e);
    }
  };

  /* ================= INITIALIZATION ================= */

  document.addEventListener('DOMContentLoaded', () => {
    // Performance guard: prevent duplicate initialization if scripts are loaded twice
    if (window.__fcScriptInitialized) {
      return;
    }
    window.__fcScriptInitialized = true;

    // Initialize DataManager
    if (window.DataManager && typeof DataManager._initData === 'function') {
      DataManager._initData();
    }
    
    // Hide duplicate page-section elements at end of HTML
    try {
      const duplicateSections = document.querySelectorAll('section.page-section');
      duplicateSections.forEach(sec => {
        if (sec.id === 'dashboard' || sec.id === 'about' || sec.id === 'contact') {
          sec.style.display = 'none';
        }
      });
    } catch (e) {}
    
    // Render recent activity if element exists
    if (document.getElementById('recent-activity-container') || document.getElementById('recent-activity-list')) {
      requestAnimationFrame(() => {
        if (typeof window.renderRecentActivity === 'function') {
          window.renderRecentActivity();
        }
      });
    }
  });

  // Export helper functions globally
  window.formatShortDate = formatShortDate;
  window.escapeHtml = escapeHtml;

})();

(function () {
  const contactForm = document.querySelector('form[name="contact"]');
  if (!contactForm) return;
  const msgDiv = document.getElementById('contact-page-form-message');
  if (!msgDiv) return;

  let hideTimer = null;

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (hideTimer) clearTimeout(hideTimer);
    const formData = new FormData(contactForm);
    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(Object.fromEntries(formData)).toString()
      });
      if (response.ok) {
        contactForm.reset();
        msgDiv.style.display = 'block';
        msgDiv.style.color = 'var(--accent-green)';
        msgDiv.style.background = 'rgba(46, 213, 115, 0.1)';
        msgDiv.style.border = '1px solid var(--accent-green)';
        msgDiv.textContent = "Message sent successfully. We'll get back to you soon.";
        hideTimer = setTimeout(function () {
          msgDiv.style.display = 'none';
          hideTimer = null;
        }, 7000);
      } else {
        throw new Error('Form submission failed');
      }
    } catch (err) {
      msgDiv.style.display = 'block';
      msgDiv.style.color = 'var(--accent-red)';
      msgDiv.style.background = 'rgba(255, 71, 87, 0.1)';
      msgDiv.style.border = '1px solid var(--accent-red)';
      msgDiv.textContent = 'Error sending message. Please try again later.';
    }
  });
})();
