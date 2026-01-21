# Firebase Setup Instructions

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard

## Step 2: Enable Authentication

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable **Email/Password** provider
3. Click "Save"

## Step 3: Create Firestore Database

1. Go to **Firestore Database** in Firebase Console
2. Click "Create database"
3. Start in **test mode** (for development) or **production mode** (with security rules)
4. Choose a location for your database

## Step 4: Set Firestore Security Rules

Go to **Firestore Database** > **Rules** and add:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Step 5: Get Firebase Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll down to "Your apps"
3. Click the web icon (`</>`) to add a web app
4. Register your app (you can skip hosting for now)
5. Copy the Firebase configuration object

## Step 6: Update firebase-config.js

Open `firebase-config.js` and replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

## Step 7: Test Authentication

1. Open `index.html` in your browser
2. Click "Create Account" to sign up
3. Enter an email and password (min 6 characters)
4. You should be redirected to the dashboard

## Notes

- **Local Mode Fallback**: If Firebase is not configured, the app will work in local mode (data stored only in browser)
- **Security**: For production, update Firestore rules to be more restrictive
- **Hosting**: You can deploy to Firebase Hosting for free

## Troubleshooting

- **"Firebase not initialized"**: Check that firebase-config.js has correct credentials
- **"Permission denied"**: Check Firestore security rules
- **"Email already in use"**: Try signing in instead of signing up

