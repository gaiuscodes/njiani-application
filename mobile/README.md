# Njiani Mobile App

Flutter mobile application for Njiani delivery marketplace.

## Setup Instructions

1. **Install Flutter**: Follow the official guide at https://flutter.dev/docs/get-started/install

2. **Install Dependencies**:

   ```bash
   cd mobile
   flutter pub get
   ```

3. **Configure API Endpoint**:

   - Update `lib/config/api_config.dart` with your backend URL
   - Default: `http://localhost:5000` (development)
   - Production: Update with your deployed backend URL

4. **iOS Setup** (for App Store):

   ```bash
   cd ios
   pod install
   cd ..
   ```

   - Update `ios/Runner/Info.plist` with location permissions
   - Configure signing in Xcode

5. **Android Setup** (for Play Store):

   - Update `android/app/build.gradle` with your package name
   - Generate signing key for release builds
   - Update `android/app/src/main/AndroidManifest.xml` with permissions

6. **Run the App**:
   ```bash
   flutter run
   ```

## Building for Release

### Android (APK/AAB):

```bash
flutter build apk --release
# or for app bundle
flutter build appbundle --release
```

### iOS:

```bash
flutter build ios --release
```

### Web:

```bash
flutter build web --release
```

## Features

- ✅ Rider, Shop, and Admin authentication
- ✅ Real-time order tracking with Socket.io
- ✅ Google Maps integration
- ✅ M-Pesa payment integration
- ✅ Push notifications
- ✅ Offline support
- ✅ Dark theme with orange accents








