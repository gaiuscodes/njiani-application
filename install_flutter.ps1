# Flutter Installation Script for Windows
# Run this script as Administrator

Write-Host "Flutter Installation Script" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Please run this script as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Flutter installation directory
$flutterPath = "C:\flutter"
$flutterZip = "$env:TEMP\flutter_windows.zip"
$flutterUrl = "https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.24.0-stable.zip"

# Check if Flutter is already installed
if (Test-Path $flutterPath) {
    Write-Host "Flutter appears to be already installed at $flutterPath" -ForegroundColor Yellow
    $response = Read-Host "Do you want to reinstall? (y/N)"
    if ($response -ne "y") {
        Write-Host "Installation cancelled." -ForegroundColor Yellow
        exit 0
    }
    Remove-Item -Path $flutterPath -Recurse -Force
}

# Check if Git is installed
Write-Host "`nChecking for Git..." -ForegroundColor Cyan
try {
    $gitVersion = git --version
    Write-Host "Git found: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "Git is not installed. Please install Git from https://git-scm.com/download/win" -ForegroundColor Red
    Write-Host "After installing Git, run this script again." -ForegroundColor Yellow
    exit 1
}

# Download Flutter SDK
Write-Host "`nDownloading Flutter SDK..." -ForegroundColor Cyan
Write-Host "This may take a few minutes..." -ForegroundColor Yellow

try {
    Invoke-WebRequest -Uri $flutterUrl -OutFile $flutterZip -UseBasicParsing
    Write-Host "Download complete!" -ForegroundColor Green
} catch {
    Write-Host "Failed to download Flutter SDK. Error: $_" -ForegroundColor Red
    Write-Host "Please download manually from: https://docs.flutter.dev/get-started/install/windows" -ForegroundColor Yellow
    exit 1
}

# Extract Flutter SDK
Write-Host "`nExtracting Flutter SDK to $flutterPath..." -ForegroundColor Cyan
try {
    Expand-Archive -Path $flutterZip -DestinationPath "C:\" -Force
    Write-Host "Extraction complete!" -ForegroundColor Green
} catch {
    Write-Host "Failed to extract Flutter SDK. Error: $_" -ForegroundColor Red
    exit 1
}

# Clean up zip file
Remove-Item -Path $flutterZip -Force

# Add Flutter to PATH
Write-Host "`nAdding Flutter to PATH..." -ForegroundColor Cyan
$flutterBinPath = "$flutterPath\bin"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")

if ($currentPath -notlike "*$flutterBinPath*") {
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$flutterBinPath", "Machine")
    Write-Host "Flutter added to PATH!" -ForegroundColor Green
} else {
    Write-Host "Flutter is already in PATH." -ForegroundColor Yellow
}

# Refresh PATH in current session
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

# Verify Flutter installation
Write-Host "`nVerifying Flutter installation..." -ForegroundColor Cyan
try {
    & "$flutterBinPath\flutter.bat" --version
    Write-Host "`nFlutter installed successfully!" -ForegroundColor Green
} catch {
    Write-Host "Flutter installation verification failed. You may need to restart your terminal." -ForegroundColor Yellow
}

# Run flutter doctor
Write-Host "`nRunning flutter doctor to check dependencies..." -ForegroundColor Cyan
Write-Host "This will show what additional tools you need to install." -ForegroundColor Yellow
& "$flutterBinPath\flutter.bat" doctor

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Restart your terminal/PowerShell" -ForegroundColor White
Write-Host "2. Install Android Studio from https://developer.android.com/studio" -ForegroundColor White
Write-Host "3. Run 'flutter doctor' to see what else is needed" -ForegroundColor White
Write-Host "4. Navigate to the mobile directory and run 'flutter pub get'" -ForegroundColor White

