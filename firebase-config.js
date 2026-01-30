// ============================================
// FIREBASE CONFIGURATION
// ============================================
// NOTE: Replace these with your actual Firebase project credentials
// Get them from: https://console.firebase.google.com/

// CRITICAL: Block file:// protocol execution
(function() {
    const protocol = window.location.protocol;
    if (protocol === 'file:') {
        // Block Firebase initialization completely (use promise so callers can await)
        window.firebaseReady = Promise.resolve(false);
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

// Global promise-based initialization guard. Firebase initializes ONLY ONCE; no auth until this resolves.
function initFirebase() {
    if (window._firebaseReadyPromise) {
        return window._firebaseReadyPromise;
    }
    window._firebaseReadyPromise = new Promise((resolve) => {
        // Unavailable (e.g. file://): resolve false so callers can await without hanging
        if (window.location.protocol === 'file:' || !window.isFirebaseAvailable()) {
            resolve(false);
            return;
        }
        try {
            // getApps shim for compat
            window.getApps = window.getApps || function () {
                try {
                    return (window.firebase && Array.isArray(window.firebase.apps)) ? window.firebase.apps : [];
                } catch (e) {
                    return [];
                }
            };

            // Initialize app ONLY ONCE
            if (window.getApps().length === 0) {
                firebase.initializeApp(firebaseConfig);
            }

            const auth = firebase.auth();
            const db = firebase.firestore();

            // Firestore settings FIRST (singleton)
            if (typeof db.settings === 'function' && !window.__firestoreSettingsApplied) {
                try {
                    db.settings({
                        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
                        ignoreUndefinedProperties: true
                    });
                    window.__firestoreSettingsApplied = true;
                } catch (settingsError) {
                    if (!settingsError.message || !settingsError.message.includes('already been started')) {
                        console.error('Firestore settings error:', settingsError);
                    }
                }
            }

            // Resolve ONLY after persistence attempt completes so auth is safe to use
            function finish() {
                window.firebaseAuth = auth;
                window.firebaseDb = db;
                resolve(true);
            }

            if (typeof db.enablePersistence === 'function') {
                db.enablePersistence({ synchronizeTabs: true }).catch(function() {}).then(finish);
            } else {
                finish();
            }
        } catch (e) {
            console.error('Firebase initialization failed:', e);
            resolve(false);
        }
    });
    return window._firebaseReadyPromise;
}

// Single global promise: same as initFirebase() for await-based guards
window.firebaseReady = null;
if (window.location.protocol !== 'file:' && window.isFirebaseAvailable()) {
    window.firebaseReady = initFirebase();
} else {
    window.firebaseReady = Promise.resolve(false);
}
window.initFirebase = initFirebase;

