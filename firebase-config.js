// ============================================
// FIREBASE CONFIGURATION
// ============================================
// NOTE: Replace these with your actual Firebase project credentials
// Get them from: https://console.firebase.google.com/

// CRITICAL: Block file:// protocol execution
(function() {
    const protocol = window.location.protocol;
    if (protocol === 'file:') {
        // Block Firebase initialization completely
        window.firebaseReady = false;
        window.isFirebaseAvailable = function() { return false; };
        
        // Show blocking error message
        const errorMessage = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #1a1a1a; color: #fff; display: flex; align-items: center; justify-content: center; z-index: 99999; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <div style="max-width: 600px; text-align: center;">
                    <h1 style="color: #ff4757; margin-bottom: 20px; font-size: 24px;">⚠️ Protocol Error</h1>
                    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                        Firebase cannot run on <code style="background: #2a2a2a; padding: 2px 6px; border-radius: 3px;">file://</code> protocol.
                        <br><br>
                        This app must be run on <strong>HTTP</strong> or <strong>HTTPS</strong>.
                    </p>
                    <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; margin-bottom: 30px; text-align: left;">
                        <h3 style="margin-top: 0; color: #4CAF50;">Quick Start Options:</h3>
                        <div style="margin-top: 15px;">
                            <strong>Option 1: VS Code Live Server (Recommended)</strong>
                            <ol style="margin: 10px 0; padding-left: 20px;">
                                <li>Install "Live Server" extension in VS Code</li>
                                <li>Right-click on <code>index.html</code></li>
                                <li>Select "Open with Live Server"</li>
                                <li>App opens at <code>http://127.0.0.1:5500</code></li>
                            </ol>
                        </div>
                        <div style="margin-top: 15px;">
                            <strong>Option 2: Node.js</strong>
                            <pre style="background: #1a1a1a; padding: 10px; border-radius: 4px; overflow-x: auto; margin: 10px 0;">npx http-server -p 8000</pre>
                            <p style="margin: 5px 0; font-size: 14px;">Then open: <code>http://localhost:8000</code></p>
                        </div>
                        <div style="margin-top: 15px;">
                            <strong>Option 3: Python</strong>
                            <pre style="background: #1a1a1a; padding: 10px; border-radius: 4px; overflow-x: auto; margin: 10px 0;">python -m http.server 8000</pre>
                            <p style="margin: 5px 0; font-size: 14px;">Then open: <code>http://localhost:8000</code></p>
                        </div>
                    </div>
                    <p style="font-size: 14px; color: #888;">
                        This is a Firebase security requirement, not a bug.
                    </p>
                </div>
            </div>
        `;
        document.body.innerHTML = errorMessage;
        throw new Error('Firebase cannot run on file:// protocol. Use a local HTTP server.');
    }
})();

const firebaseConfig = {
    apiKey: "AIzaSyDCdZqfsWG7xoVZM9CiuFXbuis9kP1mteE",
    authDomain: "finance-clarity-d2963.firebaseapp.com",
    projectId: "finance-clarity-d2963",
    storageBucket: "finance-clarity-d2963.firebasestorage.app",
    messagingSenderId: "729552731398",
    appId: "1:729552731398:web:4b2822d8ce5a5282d9b287"
};

// Firebase availability checker
window.isFirebaseAvailable = function() {
    return typeof firebase !== 'undefined' && 
           typeof firebase.initializeApp === 'function' &&
           typeof firebase.auth === 'function' &&
           typeof firebase.firestore === 'function';
};

// Initialize Firebase with optimizations
// CRITICAL: Do NOT initialize Firebase on file:// protocol (already blocked above, but double-check)
if (window.location.protocol !== 'file:' && window.isFirebaseAvailable()) {
    try {
        // Firebase modular-API compatibility shim (required by readiness/double-init guards)
        // getApps() is used in Firebase v9 modular, but this app uses the v8 compat global.
        // Provide a safe shim so we can use getApps().length === 0 without changing SDK.
        window.getApps = window.getApps || function () {
            try {
                return (window.firebase && Array.isArray(window.firebase.apps)) ? window.firebase.apps : [];
            } catch (e) {
                console.error('getApps() shim failed:', e);
                return [];
            }
        };

        // Global readiness controls (promise + resolved flag)
        // NOTE: keep a separate boolean flag to avoid breaking existing code paths that used window.firebaseReady as boolean.
        if (typeof window.__firebaseReadyResolved !== 'boolean') {
            window.__firebaseReadyResolved = false;
        }

        // A) Add a global Firebase readiness promise (resolves after initializeApp + service exports)
        if (!window.firebaseReady || typeof window.firebaseReady.then !== 'function') {
            window.firebaseReady = new Promise((resolve) => {
                window.__resolveFirebaseReady = resolve;
            });
        }

        // B) Prevent double initialization
        if (window.getApps().length === 0) {
            firebase.initializeApp(firebaseConfig);
        }
        
        // Initialize Firebase services
        const auth = firebase.auth();
        const db = firebase.firestore();
        
        // CRITICAL: Configure Firestore settings FIRST, before any operations or persistence
        // Settings must be applied before Firestore is used anywhere
        // Use singleton guard to prevent "settings can no longer be changed" error
        if (typeof db.settings === 'function' && !window.__firestoreSettingsApplied) {
            try {
                db.settings({
                    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
                    ignoreUndefinedProperties: true
                });
                window.__firestoreSettingsApplied = true;
            } catch (settingsError) {
                // If settings already applied, ignore (singleton guard prevents this, but be safe)
                if (!settingsError.message || !settingsError.message.includes('already been started')) {
                    console.error('Firestore settings error:', settingsError);
                }
            }
        }
        
        // Enable Firestore persistence for offline support and performance
        // Must be called AFTER settings, but persistence can be called multiple times safely
        if (typeof db.enablePersistence === 'function') {
            db.enablePersistence({
                synchronizeTabs: true
            }).catch(function(err) {
                // Silent fail - persistence may not be available in all browsers
                // All error codes are expected and handled silently
            });
        }
        
        // Export for use in other files (ONLY after settings are applied)
        window.firebaseAuth = auth;
        window.firebaseDb = db;
        // Resolve readiness promise and set resolved flag (keep compatibility)
        window.__firebaseReadyResolved = true;
        try {
            if (typeof window.__resolveFirebaseReady === 'function') {
                window.__resolveFirebaseReady(true);
            }
        } catch (e) {
            console.error('Failed to resolve firebaseReady promise:', e);
        }
    } catch (e) {
        // No silent catch blocks: surface the real initialization error
        console.error('Firebase initialization failed:', e);
        window.__firebaseReadyResolved = false;
        try {
            if (typeof window.__resolveFirebaseReady === 'function') {
                window.__resolveFirebaseReady(false);
            }
        } catch (err) {
            console.error('Failed to resolve firebaseReady promise after init failure:', err);
        }
    }
} else {
    // Ensure firebaseReady promise exists even when Firebase is unavailable (so callers can await deterministically)
    if (!window.firebaseReady || typeof window.firebaseReady.then !== 'function') {
        window.firebaseReady = Promise.resolve(false);
    }
    window.__firebaseReadyResolved = false;
}

