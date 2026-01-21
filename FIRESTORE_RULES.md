# Firestore Security Rules

## Overview
These security rules ensure that users can only access their own data, providing complete data isolation.

## Rules Structure

Copy and paste these rules into your Firebase Console:
**Firestore Database > Rules**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // User documents - users can only read/write their own document
    match /users/{userId} {
      allow read, write: if isOwner(userId);
      
      // User's history subcollection
      match /history/{historyId} {
        allow read, write: if isOwner(userId);
      }
      
      // User's finance data subcollection
      match /data/{dataId} {
        allow read, write: if isOwner(userId);
      }
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Rule Breakdown

### 1. User Documents (`/users/{userId}`)
- **Read**: Only the authenticated user can read their own document
- **Write**: Only the authenticated user can write to their own document
- **Structure**: Contains `email`, `createdAt`, `lastLogin`

### 2. History Subcollection (`/users/{userId}/history/{historyId}`)
- **Read**: User can only read their own history entries
- **Write**: User can only create/update/delete their own history entries
- **Structure**: Contains `amount`, `category`, `type`, `createdAt`, `name`, `action`

### 3. Data Subcollection (`/users/{userId}/data/{dataId}`)
- **Read**: User can only read their own finance data
- **Write**: User can only write their own finance data
- **Structure**: Contains income, expenses, flexible spending, etc.

## Testing Rules

### Test Cases

1. **User can read own data**: ✅ Should work
2. **User cannot read other user's data**: ✅ Should be denied
3. **Unauthenticated user cannot read any data**: ✅ Should be denied
4. **User can write to own history**: ✅ Should work
5. **User cannot write to other user's history**: ✅ Should be denied

## Deployment

1. Go to Firebase Console
2. Navigate to **Firestore Database > Rules**
3. Paste the rules above
4. Click **Publish**

## Important Notes

- **Never disable these rules in production**
- Rules are evaluated server-side, so they cannot be bypassed
- Always test rules using the Firebase Console Rules Playground
- The `request.auth.uid` must match the document's `userId` for access

## Development Mode

If you need to test without authentication (development only), you can temporarily use:

```javascript
// ⚠️ DEVELOPMENT ONLY - DO NOT USE IN PRODUCTION
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**Remember to restore production rules before deploying!**

