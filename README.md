# Finance Clarity Tool

A modern, dark-themed personal finance tracking application with authentication, data visualization, and comprehensive history tracking.

## Features

✅ **Dark Theme UI** - Modern, gradient-based dark interface with smooth animations  
✅ **Interactive Charts** - Pie, Line, and Bar charts using Chart.js  
✅ **Transaction History** - Complete tracking of all income and expense changes  
✅ **Firebase Authentication** - Secure user authentication with data isolation  
✅ **Data Visualization** - Real-time charts showing expense breakdown, savings trends, and spending comparison  
✅ **Admin Panel** - Separate admin interface for system monitoring  
✅ **Responsive Design** - Works seamlessly on mobile, tablet, and desktop  

## Setup Instructions

### 1. Firebase Setup (Required for Authentication)

1. Follow the instructions in `FIREBASE_SETUP.md`
2. Update `firebase-config.js` with your Firebase credentials
3. Enable Email/Password authentication in Firebase Console
4. Set up Firestore database with security rules

### 2. Local Setup (Without Firebase)

The app will work in local mode if Firebase is not configured, but:
- Data will only be stored in browser LocalStorage
- No cross-device sync
- No true user isolation

### 3. Running the Application

1. Open `index.html` in a web browser
2. If Firebase is configured, sign up or sign in
3. Start tracking your finances!

## File Structure

```
├── index.html          # Main user website
├── admin.html          # Admin panel (separate)
├── style.css           # Dark theme styles
├── script.js           # Data management layer
├── auth.js             # Authentication management
├── charts.js           # Chart.js integration
├── firebase-config.js  # Firebase configuration
├── FIREBASE_SETUP.md   # Firebase setup guide
└── README.md           # This file
```

## Usage

### User Website (index.html)

- **Sign In/Sign Up**: Create an account or sign in
- **Add Income**: Track multiple income sources
- **Add Expenses**: Record fixed monthly expenses
- **Set Spending Limits**: Configure flexible spending categories
- **Check Affordability**: Use the decision tool before purchases
- **View Charts**: See visual breakdowns of your finances
- **View History**: Track all transaction changes

### Admin Panel (admin.html)

- **Login**: Use admin credentials (default: admin/admin123)
- **Financial Overview**: System-wide financial metrics
- **Health Analysis**: Detect financial health issues
- **Affordability Logs**: View all purchase checks
- **System Monitoring**: Track users, sessions, and transactions
- **Settings**: Configure thresholds and warnings

## Security Features

- ✅ User data isolation (each user sees only their data)
- ✅ Secure Firebase authentication
- ✅ Firestore security rules
- ✅ Encrypted password storage
- ✅ Protected admin routes
- ✅ No sensitive data in frontend code

## Performance Optimizations

- ✅ Lazy loading of charts
- ✅ Debounced data sync to Firebase
- ✅ Efficient LocalStorage usage
- ✅ Optimized chart rendering
- ✅ Smooth animations with CSS transitions
- ✅ Responsive image loading

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Notes

- Data is stored in Firebase Firestore when authenticated
- LocalStorage is used as a fallback/cache
- Charts update automatically when data changes
- History is limited to last 500 entries
- Affordability logs are limited to last 100 entries

## Troubleshooting

**Charts not showing?**
- Ensure Chart.js CDN is loading
- Check browser console for errors

**Authentication not working?**
- Verify Firebase configuration in `firebase-config.js`
- Check Firebase Console for authentication errors
- Ensure Firestore security rules are set correctly

**Data not syncing?**
- Check Firebase connection
- Verify user is authenticated
- Check browser console for errors

## License

This project is open source and available for personal use.

