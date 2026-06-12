# Njiani Mobile App Integration Guide

## Overview

The Flutter mobile app has been created and integrated with your existing Node.js/Express backend. The app can be built for:

- **Android** (Google Play Store)
- **iOS** (Apple App Store)
- **Web** (Progressive Web App)

## Project Structure

```
mobile/
├── lib/
│   ├── config/          # API configuration
│   ├── providers/       # State management (Auth, Orders, Socket)
│   ├── screens/         # UI screens
│   ├── services/        # API service layer
│   └── utils/           # Theme and utilities
├── android/             # Android configuration
├── ios/                 # iOS configuration
└── pubspec.yaml         # Dependencies

```

## Current Status

### ✅ Completed

- Project structure and configuration
- API service layer connecting to existing backend
- Authentication provider (login/logout)
- Order provider (fetch orders, place bids)
- Socket.io provider for real-time updates
- Theme matching web app (dark + orange)
- Landing screen with glassmorphism navigation
- Rider login and signup screens
- Basic Rider dashboard structure
- Android and iOS build configuration

### 🚧 In Progress / To Complete

- Shop login/signup screens
- Admin login screen
- Complete Rider dashboard (bidding, wallet, tracking)
- Complete Shop dashboard (create orders, accept bids, tracking)
- Complete Admin dashboard
- Google Maps integration
- Image upload functionality
- Push notifications
- Offline support

## Setup Instructions

### 1. Install Flutter

Download and install Flutter from: https://flutter.dev/docs/get-started/install

Verify installation:

```bash
flutter doctor
```

### 2. Install Dependencies

```bash
cd mobile
flutter pub get
```

### 3. Configure Backend URL

Edit `mobile/lib/config/api_config.dart`:

```dart
static const String baseUrl = 'https://your-backend-url.com';
```

### 4. Run the App

```bash
flutter run
```

## Building for Release

### Android (APK)

```bash
flutter build apk --release
```

Output: `build/app/outputs/flutter-apk/app-release.apk`

### Android (App Bundle for Play Store)

```bash
flutter build appbundle --release
```

Output: `build/app/outputs/bundle/release/app-release.aab`

### iOS (requires Mac)

```bash
flutter build ios --release
```

### Web

```bash
flutter build web --release
```

## App Store Submission

### Google Play Store

1. **Create Developer Account**: https://play.google.com/console ($25 one-time)

2. **Generate Signing Key**:

   ```bash
   keytool -genkey -v -keystore ~/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```

3. **Configure Signing**:

   - Create `android/key.properties`
   - Update `android/app/build.gradle` with signing config

4. **Build App Bundle**:

   ```bash
   flutter build appbundle --release
   ```

5. **Upload to Play Console**:
   - Go to https://play.google.com/console
   - Create new app
   - Upload AAB file
   - Fill in store listing, screenshots, etc.
   - Submit for review

### Apple App Store

1. **Create Developer Account**: https://developer.apple.com ($99/year)

2. **Configure in Xcode**:

   ```bash
   open ios/Runner.xcworkspace
   ```

   - Set up signing certificates
   - Configure bundle identifier
   - Set version and build number

3. **Build and Archive**:

   - In Xcode: Product → Archive
   - Upload to App Store Connect

4. **Submit for Review**:
   - Go to https://appstoreconnect.apple.com
   - Create new app
   - Fill in app information
   - Submit for review

## Features Integration

### Authentication

The app uses the same JWT cookie-based authentication as the web app. The `ApiService` handles cookie management automatically.

### Real-time Updates

Socket.io is integrated via `SocketProvider`. Connect using:

```dart
socketProvider.connect(userId);
socketProvider.listenToNewOrders((order) {
  // Handle new order
});
```

### Google Maps

To enable Google Maps:

1. Get API key from Google Cloud Console
2. Add to `android/app/src/main/AndroidManifest.xml` (Android)
3. Add to `ios/Runner/AppDelegate.swift` (iOS)

### M-Pesa Integration

The app uses the same M-Pesa STK push endpoints as the web app. The backend handles all payment processing.

## Next Steps

1. **Complete Remaining Screens**:

   - Finish Shop and Admin dashboards
   - Add all missing features (wallet, notifications, messages)

2. **Add Push Notifications**:

   - Firebase Cloud Messaging (FCM) for Android
   - Apple Push Notification Service (APNs) for iOS

3. **Testing**:

   - Test on real devices
   - Test all user flows
   - Test offline functionality

4. **Polish**:

   - Add loading states
   - Improve error handling
   - Add animations
   - Optimize performance

5. **Deploy**:
   - Build release versions
   - Submit to app stores
   - Deploy web version

## Support

The mobile app shares the same backend API as the web app, so all existing endpoints work seamlessly. Any backend updates will automatically be available to the mobile app.








