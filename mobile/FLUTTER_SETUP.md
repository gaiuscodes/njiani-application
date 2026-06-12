# Flutter Mobile App Setup Guide

## Prerequisites

1. **Install Flutter**:

   - Download from https://flutter.dev/docs/get-started/install
   - Add Flutter to your PATH
   - Run `flutter doctor` to verify installation

2. **Install Dependencies**:
   ```bash
   cd mobile
   flutter pub get
   ```

## Configuration

### 1. Update API Endpoint

Edit `lib/config/api_config.dart`:

```dart
static const String baseUrl = 'https://your-backend-url.com';
```

### 2. Android Configuration

**Update `android/app/build.gradle`**:

- Set `applicationId` to your package name (e.g., `com.njiani.app`)
- Set `versionCode` and `versionName`

**Update `android/app/src/main/AndroidManifest.xml`**:

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<uses-permission android:name="android.permission.CAMERA"/>
```

**For Google Maps** (if using):

- Get API key from Google Cloud Console
- Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="YOUR_API_KEY"/>
```

### 3. iOS Configuration

**Update `ios/Runner/Info.plist`**:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to track deliveries</string>
<key>NSCameraUsageDescription</key>
<string>We need camera access to upload photos</string>
```

**For Google Maps**:

- Add to `ios/Runner/AppDelegate.swift`:

```swift
import GoogleMaps
GMSServices.provideAPIKey("YOUR_API_KEY")
```

### 4. Build for Release

**Android APK**:

```bash
flutter build apk --release
```

**Android App Bundle** (for Play Store):

```bash
flutter build appbundle --release
```

**iOS** (requires Mac and Xcode):

```bash
flutter build ios --release
```

**Web**:

```bash
flutter build web --release
```

## App Store Submission

### Google Play Store

1. Create a Google Play Developer account ($25 one-time fee)
2. Generate a signed APK/AAB:
   ```bash
   keytool -genkey -v -keystore ~/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```
3. Configure signing in `android/key.properties`
4. Upload AAB to Google Play Console
5. Fill in store listing, screenshots, etc.

### Apple App Store

1. Create an Apple Developer account ($99/year)
2. Configure signing in Xcode
3. Archive the app in Xcode
4. Upload to App Store Connect
5. Submit for review

## Features Implemented

- ✅ Authentication (Rider, Shop, Admin)
- ✅ Real-time order tracking
- ✅ Google Maps integration
- ✅ Socket.io for live updates
- ✅ M-Pesa payment integration
- ✅ Dark theme with orange accents
- ✅ Responsive design

## Next Steps

1. Complete the remaining screen implementations
2. Add push notifications
3. Implement offline support
4. Add analytics
5. Test on real devices
6. Submit to app stores








