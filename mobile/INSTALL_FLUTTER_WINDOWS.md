# Flutter Installation Guide for Windows

## Quick Installation Steps

### Option 1: Using Git (Recommended)

1. **Install Git** (if not already installed):

   - Download from: https://git-scm.com/download/win
   - Or use: `winget install Git.Git`

2. **Clone Flutter SDK**:

   ```powershell
   cd C:\
   git clone https://github.com/flutter/flutter.git -b stable
   ```

3. **Add Flutter to PATH**:

   - Press `Win + X` and select "System"
   - Click "Advanced system settings"
   - Click "Environment Variables"
   - Under "User variables", find "Path" and click "Edit"
   - Click "New" and add: `C:\flutter\bin`
   - Click "OK" on all dialogs

4. **Restart PowerShell/Terminal** and verify:
   ```powershell
   flutter --version
   ```

### Option 2: Manual Download

1. **Download Flutter SDK**:

   - Go to: https://docs.flutter.dev/get-started/install/windows
   - Download the latest stable release ZIP file

2. **Extract**:

   - Extract to `C:\flutter` (or your preferred location)
   - **Important**: Don't extract to a folder that requires elevated privileges (like `C:\Program Files\`)

3. **Add to PATH** (same as Option 1, step 3)

### Install Dependencies

After Flutter is installed, run:

```powershell
flutter doctor
```

This will show what's missing. Common requirements:

1. **Android Studio** (for Android development):

   - Download: https://developer.android.com/studio
   - Install Android SDK, Android SDK Platform-Tools
   - Accept Android licenses: `flutter doctor --android-licenses`

2. **Visual Studio** (for Windows desktop apps):

   - Install "Desktop development with C++" workload
   - Or use: `winget install Microsoft.VisualStudio.2022.Community`

3. **Chrome** (for web development):
   - Already installed on most systems

## Automated Installation Script

Run the PowerShell script: `install_flutter.ps1`

## Verify Installation

```powershell
flutter doctor -v
```

All checks should show green checkmarks (✓) for a complete setup.








