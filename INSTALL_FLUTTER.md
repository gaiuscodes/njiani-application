# Flutter Installation Guide for Windows

## Quick Installation Steps

### 1. Download Flutter SDK

Download the latest Flutter SDK from: https://docs.flutter.dev/get-started/install/windows

Direct download link (stable): https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.24.0-stable.zip

### 2. Extract Flutter

Extract the ZIP file to a location like:
- `C:\flutter` (recommended)
- Or `C:\src\flutter`

**Important**: Do NOT install Flutter in a path with spaces or special characters.

### 3. Add Flutter to PATH

1. Open "Environment Variables" in Windows
2. Under "System variables", find "Path" and click "Edit"
3. Click "New" and add: `C:\flutter\bin` (or your Flutter path)
4. Click "OK" on all dialogs
5. Restart your terminal/PowerShell

### 4. Verify Installation

Open a new PowerShell window and run:
```powershell
flutter --version
flutter doctor
```

### 5. Install Additional Dependencies

Flutter doctor will tell you what's missing. Common requirements:
- **Git** - Download from https://git-scm.com/download/win
- **Android Studio** - Download from https://developer.android.com/studio
- **Visual Studio** (for Windows desktop development) - Optional

### 6. Install Android Studio

1. Download and install Android Studio
2. Open Android Studio → Settings → Plugins
3. Search for "Flutter" and install it (Dart plugin will be installed automatically)
4. Open Android Studio → More Actions → SDK Manager
5. Install Android SDK, Android SDK Platform, and Android Virtual Device

### 7. Accept Android Licenses

```powershell
flutter doctor --android-licenses
```

### 8. Install Project Dependencies

Once Flutter is installed, navigate to the mobile directory and run:
```powershell
cd mobile
flutter pub get
```

## Automated Installation Script

Run the PowerShell script below to automate the download and setup:

