// ============================================
// AUTHENTICATION MANAGEMENT (FIXED & STABLE)
// ============================================
// Preserve listeners registered with stub before Firebase lazy-load
var _stubListeners = (window.AuthManager && Array.isArray(window.AuthManager.authStateListeners))
    ? window.AuthManager.authStateListeners.slice()
    : [];

window.AuthManager = {
    currentUser: null,
    authStateListeners: _stubListeners,
    historyUnsubscribe: null,
    isLoadingData: false,
    hasLoadedInitialData: false,
    // Performance: Cache user data in memory
    cachedUserData: null,
    cachedFinanceData: null,
    cachedHistoryData: null,
    authStateResolved: false,

    isAuthenticated() {
        return this.currentUser !== null;
    },

    getCurrentUser() {
        return this.currentUser;
    },

    isFirebaseReady() {
        // CRITICAL: Block file:// protocol
        if (window.location.protocol === 'file:') {
            return false;
        }
        return typeof window.isFirebaseAvailable === 'function' && 
               window.isFirebaseAvailable() && 
               window.firebaseAuth && 
               window.firebaseDb;
    },

    // Global promise-based guard: no auth action until Firebase is fully initialized
    async waitForFirebaseReady() {
        try {
            const promise = typeof window.initFirebase === 'function' ? window.initFirebase() : window.firebaseReady;
            if (promise && typeof promise.then === 'function') {
                const ok = await promise;
                return !!(ok && this.isFirebaseReady());
            }
            return !!this.isFirebaseReady();
        } catch (e) {
            console.error('firebaseReady promise rejected:', e);
            return false;
        }
    },

    init() {
        // CRITICAL: Don't show errors during initialization - wait for auth state
        let firebaseLoadingState = 'initializing';
        
        // Setup offline/online event listeners for real network detection
        if (typeof window !== 'undefined') {
            window.addEventListener('offline', () => {
                this.handleRealOffline();
            });
            
            window.addEventListener('online', () => {
                this.handleRealOnline();
            });
        }

        // Attach auth state listener only after Firebase readiness promise resolves
        const attachAuthListener = () => {
            if (!window.firebaseAuth) return;
            window.firebaseAuth.onAuthStateChanged(async (user) => {
                firebaseLoadingState = 'ready';
                this.hideLoadingState();
                // A/B/E: mark Firebase ready only AFTER onAuthStateChanged fires at least once
                if (user && user.uid) {
                // Clear any previous user's data before loading new user
                if (this.currentUser && this.currentUser.uid && this.currentUser.uid !== user.uid) {
                    this.clearDashboardUI();
                    this.clearCharts();
                    if (window.DataManager) {
                        window.DataManager.clearAllUserData(this.currentUser.uid);
                        window.DataManager._resetData();
                    }
                }

                this.currentUser = user;

                await waitForAuthReady();

                document.getElementById("main-app")?.classList.remove("hidden");
                document.getElementById("welcome-screen")?.classList.add("hidden");
                document.getElementById("auth-modal")?.classList.remove("active");

                // Mark auth state as resolved
                this.authStateResolved = true;
                
                // Reset loading flags for new user
                if (!this.hasLoadedInitialData || (this.currentUser && this.currentUser.uid !== user.uid)) {
                    this.hasLoadedInitialData = false;
                    this.isLoadingData = false;
                    // Clear cache for new user
                    this.cachedUserData = null;
                    this.cachedFinanceData = null;
                    this.cachedHistoryData = null;
                }

                // If data already loaded and cached, use cache for instant response
                if (this.hasLoadedInitialData && this.cachedFinanceData && this.cachedFinanceData.userId === user.uid) {
                    // Use cached data immediately
                    if (window.DataManager) {
                        window.DataManager._initData();
                    }
                    this.notifyAuthStateChange(user);
                    if (typeof init === 'function' && !window.hasInitialized) {
                        window.hasInitialized = true;
                        init();
                    }
                    return;
                }

                if (this.isLoadingData) return;
                this.isLoadingData = true;

                try {
                    // CRITICAL SEQUENCING: Load user document first and wait for completion
                    await this.loadUserData(user);
                    
                    // Small delay to ensure user document is fully written before accessing subcollections
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Load finance data from Firestore (source of truth) - with caching
                    await this.loadFinanceDataFromFirestore();
                    
                    // Load history from Firestore - with caching (non-blocking for performance)
                    this.loadHistoryFromFirestore().catch(() => {
                        // Silent fail - history is non-critical for initial dashboard load
                    });

                    // Initialize DataManager with loaded data
                    if (window.DataManager) {
                        window.DataManager._initData();
                    }

                    this.hasLoadedInitialData = true;
                    this.notifyAuthStateChange(user);

                    if (typeof init === 'function' && !window.hasInitialized) {
                        window.hasInitialized = true;
                        init();
                    }
                } catch (e) {
                    // Silent fail - use cached data if available
                    if (this.cachedFinanceData && window.DataManager) {
                        window.DataManager._initData();
                    }
                    this.isLoadingData = false;
                }
            } else {
                // Clear UI state only (preserve data in Firestore and localStorage)
                this.clearDashboardUI();
                this.clearCharts();
                
                // Clear in-memory state only (DO NOT delete localStorage or Firestore)
                if (window.DataManager) {
                    window.DataManager._resetData();
                }

                this.currentUser = null;
                this.hasLoadedInitialData = false;
                this.isLoadingData = false;
                this.authStateResolved = false;
                // Clear cache
                this.cachedUserData = null;
                this.cachedFinanceData = null;
                this.cachedHistoryData = null;
                this.notifyAuthStateChange(null);

                document.getElementById("main-app")?.classList.add("hidden");
                document.getElementById("welcome-screen")?.classList.remove("hidden");
                }
            });
        };

        if (window.location.protocol === 'file:') {
            return this.initLocalMode();
        }

        const promise = typeof window.initFirebase === 'function' ? window.initFirebase() : window.firebaseReady;
        if (promise && typeof promise.then === 'function') {
            promise.then((ok) => {
                if (ok) {
                    this.hideLoadingState();
                    attachAuthListener();
                }
            }).catch(() => {});
        } else {
            if (this.isFirebaseReady() && window.firebaseAuth) {
                attachAuthListener();
            }
        }
    },
    // ===============================
    // AUTH ACTIONS
    // ===============================

    async signIn(email, password) {
        // C/F: block auth actions until Firebase is ready (no "Firebase is initializing" user-visible error)
        const ready = await this.waitForFirebaseReady();
        if (!ready || !this.isFirebaseReady()) {
            // Only show error if truly not ready after waiting
            const protocol = window.location.protocol;
            if (protocol === 'file:') {
                return { 
                    success: false, 
                    error: 'App must be run on HTTP/HTTPS. file:// is not supported. Use VS Code Live Server or run: npx http-server -p 8000' 
                };
            }
            // Check if truly offline
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                return { 
                    success: false, 
                    error: 'You are offline. Please check your internet connection.' 
                };
            }
            // If still not ready after await, return error (don't call showAuthError which may not exist)
            return { 
                success: false, 
                error: 'Firebase is initializing. Please wait a moment and try again.' 
            };
        }
        if (!this.isFirebaseReady()) {
            const protocol = window.location.protocol;
            if (protocol === 'file:') {
                return { 
                    success: false, 
                    error: 'App must be run on HTTP/HTTPS. file:// is not supported. Use VS Code Live Server or run: npx http-server -p 8000' 
                };
            }
            // Firebase still loading - don't show error yet
            return { 
                success: false, 
                error: 'Firebase is initializing. Please wait a moment and try again.' 
            };
        }
        try {
            const res = await window.firebaseAuth.signInWithEmailAndPassword(email, password);
            return { success: true, user: res.user };
        } catch (e) {
            // D: Replace generic "Unexpected error" with actual Firebase error messages (log + return mapped)
            console.error('Firebase signIn error:', e);
            // Map Firebase auth errors correctly
            let errorMessage = e.message;
            if (e.code) {
                switch (e.code) {
                    case 'auth/wrong-password':
                        errorMessage = 'Invalid password. Please try again.';
                        break;
                    case 'auth/user-not-found':
                        errorMessage = 'Account not found. Please check your email or sign up.';
                        break;
                    case 'auth/network-request-failed':
                        errorMessage = 'Network error. Please check your internet connection and try again.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'Invalid email address. Please check and try again.';
                        break;
                    case 'auth/user-disabled':
                        errorMessage = 'This account has been disabled. Please contact support.';
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = 'Too many failed attempts. Please try again later.';
                        break;
                    default:
                        errorMessage = e.message || 'Authentication failed. Please try again.';
                }
            }
            return { success: false, error: errorMessage };
        }
    },

    async signUp(email, password) {
        // C/F: block auth actions until Firebase is ready (no "Firebase is initializing" user-visible error)
        const ready = await this.waitForFirebaseReady();
        if (!ready || !this.isFirebaseReady()) {
            // Only show error if truly not ready after waiting
            const protocol = window.location.protocol;
            if (protocol === 'file:') {
                return { 
                    success: false, 
                    error: 'App must be run on HTTP/HTTPS. file:// is not supported. Use VS Code Live Server or run: npx http-server -p 8000' 
                };
            }
            // Check if truly offline
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                return { 
                    success: false, 
                    error: 'You are offline. Please check your internet connection.' 
                };
            }
            // If still not ready after await, return error (don't call showAuthError which may not exist)
            return { 
                success: false, 
                error: 'Firebase is initializing. Please wait a moment and try again.' 
            };
        }
        if (!this.isFirebaseReady()) {
            const protocol = window.location.protocol;
            if (protocol === 'file:') {
                return { 
                    success: false, 
                    error: 'App must be run on HTTP/HTTPS. file:// is not supported. Use VS Code Live Server or run: npx http-server -p 8000' 
                };
            }
            // Firebase still loading - don't show error yet
            return { 
                success: false, 
                error: 'Firebase is initializing. Please wait a moment and try again.' 
            };
        }
        try {
            const res = await window.firebaseAuth.createUserWithEmailAndPassword(email, password);
            return { success: true, user: res.user };
        } catch (e) {
            console.error('Firebase signUp error:', e);
            // Map Firebase auth errors correctly
            let errorMessage = e.message;
            if (e.code) {
                switch (e.code) {
                    case 'auth/email-already-in-use':
                        errorMessage = 'This email is already registered. Please sign in instead.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'Invalid email address. Please check and try again.';
                        break;
                    case 'auth/weak-password':
                        errorMessage = 'Password is too weak. Please use at least 6 characters.';
                        break;
                    case 'auth/network-request-failed':
                        errorMessage = 'Network error. Please check your internet connection and try again.';
                        break;
                    case 'auth/operation-not-allowed':
                        errorMessage = 'Email/password accounts are not enabled. Please contact support.';
                        break;
                    default:
                        errorMessage = e.message || 'Sign up failed. Please try again.';
                }
            }
            return { success: false, error: errorMessage };
        }
    },

    async signOut() {
        // Unsubscribe from Firestore listeners
        if (this.historyUnsubscribe) {
            this.historyUnsubscribe();
            this.historyUnsubscribe = null;
        }

        // Store current user ID before clearing
        const currentUserId = this.currentUser ? this.currentUser.uid : null;

        // Clear all in-memory state (DO NOT delete Firestore or localStorage data)
        this.hasLoadedInitialData = false;
        this.isLoadingData = false;

        // Clear DataManager in-memory state only (preserve localStorage)
        if (window.DataManager) {
            window.DataManager._resetData();
        }

        // Clear UI state
        this.clearDashboardUI();
        this.clearCharts();

        // Sign out from Firebase
        if (this.isFirebaseReady()) {
            try {
                await window.firebaseAuth.signOut();
            } catch (e) {
                // Silent fail - sign out errors are non-critical
            }
        }

        // Clear current user reference
        this.currentUser = null;
    },

    clearDashboardUI() {
        // Reset all dashboard values to zero/empty
        const resetElement = (id, value = '₹0.00') => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = value;
                el.classList.remove('loaded');
            }
        };

        resetElement('total-income');
        resetElement('total-fixed');
        resetElement('total-flexible');
        resetElement('total-savings');
        resetElement('income-section-amount');
        resetElement('fixed-section-amount');
        resetElement('flexible-section-amount');
        resetElement('savings-display-amount');

        // Clear income and expense lists
        const incomeList = document.getElementById('income-list');
        if (incomeList) {
            incomeList.className = 'empty-state';
            incomeList.innerHTML = '<p>No income sources added yet. Add your monthly income to get started.</p>';
        }

        const expenseList = document.getElementById('expense-list');
        if (expenseList) {
            expenseList.innerHTML = '';
        }

        // Reset flexible spending inputs
        ['food-limit', 'travel-limit', 'shopping-limit', 'misc-limit'].forEach(id => {
            const input = document.getElementById(id);
            if (input) input.value = '';
        });

        // Clear recent activity
        const recentActivity = document.getElementById('recent-activity-container');
        if (recentActivity) {
            recentActivity.innerHTML = '<div class="empty-state" style="padding: 40px 20px;"><div class="empty-icon">📋</div><p style="font-size: 14px; color: var(--text-secondary);">No recent activity</p></div>';
        }

        // Clear affordability check result
        const affordabilityResult = document.getElementById('affordability-result');
        if (affordabilityResult) {
            affordabilityResult.innerHTML = '';
        }

        const purchaseAmountInput = document.getElementById('purchase-amount');
        if (purchaseAmountInput) {
            purchaseAmountInput.value = '';
        }
    },

    clearCharts() {
        // Destroy all chart instances
        if (window.ChartManager && window.ChartManager.charts) {
            Object.values(window.ChartManager.charts).forEach(chart => {
                if (chart && typeof chart.destroy === 'function') {
                    chart.destroy();
                }
            });
            // Reset chart references
            window.ChartManager.charts = {
                incomeExpense: null,
                expensePie: null,
                savingsLine: null,
                savingsBar: null
            };
        }
    },

    // ===============================
    // FIRESTORE DATA
    // ===============================

    /**
     * Handle real offline state (only called when navigator.onLine === false)
     */
    handleRealOffline() {
        const submitBtn = document.getElementById('auth-submit-btn');
        const errorDiv = document.getElementById('auth-error');
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Offline';
        }
        if (errorDiv) {
            errorDiv.textContent = 'You are offline. Please check your internet connection.';
            errorDiv.style.display = 'block';
            errorDiv.style.color = '#ff4757';
        }
    },

    /**
     * Handle real online state (only called when navigator.onLine === true)
     */
    handleRealOnline() {
        const submitBtn = document.getElementById('auth-submit-btn');
        const errorDiv = document.getElementById('auth-error');
        
        // Only clear error if it was an offline error
        if (errorDiv && errorDiv.textContent.includes('offline')) {
            errorDiv.textContent = '';
            errorDiv.style.display = 'none';
        }
        if (submitBtn && this.isFirebaseReady()) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitBtn.getAttribute('data-original-text') || 'Sign In';
        }
    },

    /**
     * Hide loading/error states when Firebase is ready
     */
    hideLoadingState() {
        const submitBtn = document.getElementById('auth-submit-btn');
        const errorDiv = document.getElementById('auth-error');
        
        // Only clear if it's a loading/initialization error, not auth errors
        if (errorDiv && (errorDiv.textContent.includes('Firebase services') || errorDiv.textContent.includes('not available'))) {
            errorDiv.textContent = '';
            errorDiv.style.display = 'none';
        }
        if (submitBtn && this.isFirebaseReady()) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitBtn.getAttribute('data-original-text') || 'Sign In';
        }
    },

    /**
     * DEPRECATED: Replaced by handleRealOffline/handleRealOnline
     * Kept for backward compatibility but no longer shows generic errors
     */
    updateAuthModalForOffline() {
        const protocol = window.location.protocol;
        
        // Only handle file:// protocol error
        if (protocol === 'file:') {
            const submitBtn = document.getElementById('auth-submit-btn');
            const errorDiv = document.getElementById('auth-error');
            
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Protocol Error';
            }
            if (errorDiv) {
                errorDiv.innerHTML = 'App must be run on HTTP/HTTPS. file:// is not supported.<br><br>Use VS Code Live Server, or run: <code>npx http-server -p 8000</code>';
                errorDiv.style.display = 'block';
                errorDiv.style.color = '#ff4757';
            }
            return;
        }
        
        // For real offline, use handleRealOffline (called by event listener)
        // Don't show generic errors here
    },

    async loadUserData(user) {
        if (!user || !user.uid || !this.isFirebaseReady()) return;
        
        // CRITICAL: Abort immediately if file:// protocol
        if (window.location.protocol === 'file:') {
            return;
        }

        try {
            const userRef = window.firebaseDb.collection("users").doc(user.uid);
            // Use get() with timeout protection
            const snap = await Promise.race([
                userRef.get(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
            ]).catch(() => null);

            if (!snap || !snap.exists) {
                // New user - create document atomically with retry
                try {
                    await userRef.set({
                        email: user.email,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } catch (setError) {
                    // Retry once if set fails
                    if (setError.code === 'unavailable' || setError.message.includes('timeout')) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        await userRef.set({
                            email: user.email,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }
            } else {
                // Existing user - update lastLogin
                try {
                    await userRef.update({
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } catch (updateError) {
                    // Silent fail - update is non-critical
                }
            }
        } catch (e) {
            // Silent handling - don't log expected first-time user scenarios or network issues
        }
    },

    async saveUserData(data) {
        if (!this.currentUser || !this.currentUser.uid || !this.isFirebaseReady()) return null;
        try {
            return await window.firebaseDb
                .collection("users")
                .doc(this.currentUser.uid)
                .collection("data")
                .doc("finance")
                .set(data, { merge: true });
        } catch (e) {
            // Silent fail - save errors are handled gracefully
            return null;
        }
    },

    async saveHistoryEntry(entry) {
        if (!this.currentUser || !this.currentUser.uid || !this.isFirebaseReady()) return null;
        try {
            return await window.firebaseDb
                .collection("users")
                .doc(this.currentUser.uid)
                .collection("history")
                .add({
                    ...entry,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
        } catch (e) {
            // Silent fail - history save errors are handled gracefully
            return null;
        }
    },

    async loadFinanceDataFromFirestore() {
        if (!this.currentUser || !this.currentUser.uid || !this.isFirebaseReady()) return;
        
        // CRITICAL: Abort immediately if file:// protocol
        if (window.location.protocol === 'file:') {
            return;
        }

        // Performance: Return cached data if available and user hasn't changed
        if (this.cachedFinanceData && this.cachedFinanceData.userId === this.currentUser.uid) {
            const userKeys = DataManager._getUserKeys(this.currentUser.uid);
            if (this.cachedFinanceData.income) {
                localStorage.setItem(userKeys.INCOME, JSON.stringify(this.cachedFinanceData.income));
            }
            if (this.cachedFinanceData.fixedExpenses) {
                localStorage.setItem(userKeys.EXPENSES, JSON.stringify(this.cachedFinanceData.fixedExpenses));
            }
            if (this.cachedFinanceData.flexibleSpending) {
                localStorage.setItem(userKeys.FLEXIBLE, JSON.stringify(this.cachedFinanceData.flexibleSpending));
            }
            return;
        }

        try {
            const financeRef = window.firebaseDb
                .collection("users")
                .doc(this.currentUser.uid)
                .collection("data")
                .doc("finance");
            
            // Use get() with timeout protection and retry logic
            let financeDoc;
            try {
                financeDoc = await Promise.race([
                    financeRef.get({ source: 'server' }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
                ]);
            } catch (timeoutError) {
                // Try cache if server times out
                try {
                    financeDoc = await financeRef.get({ source: 'cache' });
                } catch (cacheError) {
                    // If both fail, create new document
                    financeDoc = null;
                }
            }

            if (window.DataManager && typeof DataManager._getUserKeys === 'function') {
                const userKeys = DataManager._getUserKeys(this.currentUser.uid);
                
                if (financeDoc.exists) {
                    const data = financeDoc.data();
                    
                    // Cache data in memory for performance
                    this.cachedFinanceData = {
                        userId: this.currentUser.uid,
                        income: data.income || [],
                        fixedExpenses: data.fixedExpenses || [],
                        flexibleSpending: data.flexibleSpending || { food: 0, travel: 0, shopping: 0, miscellaneous: 0 }
                    };
                    
                    // Sync Firestore data to localStorage (Firestore is source of truth)
                    if (data.income && Array.isArray(data.income)) {
                        localStorage.setItem(userKeys.INCOME, JSON.stringify(data.income));
                    } else {
                        localStorage.setItem(userKeys.INCOME, JSON.stringify([]));
                    }
                    
                    if (data.fixedExpenses && Array.isArray(data.fixedExpenses)) {
                        localStorage.setItem(userKeys.EXPENSES, JSON.stringify(data.fixedExpenses));
                    } else {
                        localStorage.setItem(userKeys.EXPENSES, JSON.stringify([]));
                    }
                    
                    if (data.flexibleSpending && typeof data.flexibleSpending === 'object') {
                        localStorage.setItem(userKeys.FLEXIBLE, JSON.stringify(data.flexibleSpending));
                    } else {
                        localStorage.setItem(userKeys.FLEXIBLE, JSON.stringify({ food: 0, travel: 0, shopping: 0, miscellaneous: 0 }));
                    }
                } else {
                    // New user - create finance document with default values
                    const defaultFinanceData = {
                        income: [],
                        fixedExpenses: [],
                        flexibleSpending: {
                            food: 0,
                            travel: 0,
                            shopping: 0,
                            miscellaneous: 0
                        },
                        savings: 0,
                        goals: [],
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    
                    // Create document atomically with retry
                    try {
                        await financeRef.set(defaultFinanceData);
                    } catch (setError) {
                        // Retry once if set fails
                        if (setError.code === 'unavailable' || setError.message.includes('timeout')) {
                            await new Promise(resolve => setTimeout(resolve, 500));
                            await financeRef.set(defaultFinanceData);
                        }
                    }
                    
                    // Cache default data
                    this.cachedFinanceData = {
                        userId: this.currentUser.uid,
                        income: [],
                        fixedExpenses: [],
                        flexibleSpending: { food: 0, travel: 0, shopping: 0, miscellaneous: 0 }
                    };
                    
                    // Initialize localStorage with default values
                    localStorage.setItem(userKeys.INCOME, JSON.stringify([]));
                    localStorage.setItem(userKeys.EXPENSES, JSON.stringify([]));
                    localStorage.setItem(userKeys.FLEXIBLE, JSON.stringify({ food: 0, travel: 0, shopping: 0, miscellaneous: 0 }));
                }
            }
        } catch (e) {
            // Silent handling - all errors handled gracefully
            // Initialize with defaults if Firestore fails
            if (window.DataManager && typeof DataManager._getUserKeys === 'function') {
                const userKeys = DataManager._getUserKeys(this.currentUser.uid);
                localStorage.setItem(userKeys.INCOME, JSON.stringify([]));
                localStorage.setItem(userKeys.EXPENSES, JSON.stringify([]));
                localStorage.setItem(userKeys.FLEXIBLE, JSON.stringify({ food: 0, travel: 0, shopping: 0, miscellaneous: 0 }));
                this.cachedFinanceData = {
                    userId: this.currentUser.uid,
                    income: [],
                    fixedExpenses: [],
                    flexibleSpending: { food: 0, travel: 0, shopping: 0, miscellaneous: 0 }
                };
            }
        }
    },

    async loadHistoryFromFirestore() {
        if (!this.currentUser || !this.currentUser.uid || !this.isFirebaseReady()) return [];
        
        // CRITICAL: Abort immediately if file:// protocol
        if (window.location.protocol === 'file:') {
            return [];
        }

        try {
            // Use timeout protection for history load
            const historyQuery = window.firebaseDb
                .collection("users")
                .doc(this.currentUser.uid)
                .collection("history")
                .orderBy("createdAt", "desc")
                .limit(300);
            
            let snap;
            try {
                snap = await Promise.race([
                    historyQuery.get({ source: 'server' }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
                ]);
            } catch (timeoutError) {
                // Try cache if server times out
                try {
                    snap = await historyQuery.get({ source: 'cache' });
                } catch (cacheError) {
                    // Return empty array if both fail
                    return [];
                }
            }

            const history = [];
            snap.forEach(d => history.push({ ...d.data(), id: d.id }));
            
            // Cache history in memory for performance
            this.cachedHistoryData = {
                userId: this.currentUser.uid,
                history: history
            };
            
            // Use user-specific key
            if (window.DataManager && typeof DataManager._getUserKeys === 'function') {
                const userKeys = DataManager._getUserKeys(this.currentUser.uid);
                localStorage.setItem(userKeys.HISTORY, JSON.stringify(history));
                
                // Update DataManager in-memory state
                if (window.DataManager) {
                    window.DataManager.HISTORY = history;
                }
            }
            
            return history;
        } catch (e) {
            // Silent handling - all errors handled gracefully
            return [];
        }
    },

    initLocalMode() {
        const savedUser = localStorage.getItem("local_user");
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.notifyAuthStateChange(this.currentUser);
        }
    },

    clearLocalData(userId) {
        if (!window.DataManager) return;
        if (userId) {
            const userKeys = DataManager._getUserKeys(userId);
            Object.values(userKeys).forEach(k => {
                try {
                    localStorage.removeItem(k);
                } catch (e) {
                    console.error('Failed to remove localStorage key:', k, e);
                }
            });
        }
    },

    onAuthStateChange(cb) {
        this.authStateListeners.push(cb);
        if (this.currentUser) cb(this.currentUser);
    },

    notifyAuthStateChange(user) {
        this.authStateListeners.forEach(cb => {
            try { cb(user); } catch (e) {
                console.error('Auth state listener threw:', e);
            }
        });
    }
};

// E) Ensure AuthManager is exported only after Firebase is ready
// NOTE: We do not remove existing exports; we add a readiness-controlled export pass.
try {
    if (window.firebaseReady && typeof window.firebaseReady.then === 'function') {
        window.firebaseReady.then(() => {
            try {
                // Ensure a stable reference exists for any later code that expects AuthManager identifier
                window.AuthManager = window.AuthManager || AuthManager;
            } catch (e) {
                // AuthManager identifier may not exist; ensure window.AuthManager remains set
                console.error('AuthManager export guard hit:', e);
            }
        }).catch((e) => {
            console.error('firebaseReady export guard failed:', e);
        });
    }
} catch (e) {
    console.error('Failed to set AuthManager export readiness guard:', e);
}

// ===============================
// GLOBAL SAFETY EXPORTS (CRITICAL)
// ===============================

window.saveHistoryEntry = (...args) =>
    window.AuthManager?.saveHistoryEntry?.(...args);

window.saveUserData = (...args) =>
    window.AuthManager?.saveUserData?.(...args);

// INIT
document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", () => AuthManager.init())
    : AuthManager.init();

// ===============================
// AUTH SAFETY COMPATIBILITY LAYER
// ===============================

window.waitForAuthReady = function () {
    return new Promise((resolve) => {
        const check = () => {
            if (window.AuthManager && typeof AuthManager.isAuthenticated === "function") {
                resolve();
            } else {
                setTimeout(check, 50);
            }
        };
        check();
    });
};

// ===== FINAL GLOBAL EXPORTS (CRITICAL) =====
window.AuthManager = AuthManager;
window.saveHistoryEntry = (...args) => window.AuthManager?.saveHistoryEntry?.(...args);
window.saveUserData = (...args) => window.AuthManager?.saveUserData?.(...args);   