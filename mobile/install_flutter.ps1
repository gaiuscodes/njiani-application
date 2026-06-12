# Flutter Installation Script for Windows
# Run this script as Administrator for best results

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Flutter Installation Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Warning: Not running as Administrator. Some steps may require elevation." -ForegroundColor Yellow
    Write-Host ""
}

# Check if Flutter is already installed
Write-Host "Checking if Flutter is already installed..." -ForegroundColor Yellow
try {
    $flutterVersion = flutter --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Flutter is already installed!" -ForegroundColor Green
        Write-Host $flutterVersion
        Write-Host ""
        Write-Host "Running flutter doctor..." -ForegroundColor Yellow
        flutter doctor
        exit 0
    }
}
catch {
    Write-Host "Flutter not found. Proceeding with installation..." -ForegroundColor Yellow
    Write-Host ""
}

# Check if Git is installed
Write-Host "Checking for Git..." -ForegroundColor Yellow
try {
    $gitVersion = git --version 2>&1
    Write-Host "Git found: $gitVersion" -ForegroundColor Green
}
catch {
    Write-Host "Git not found. Installing Git..." -ForegroundColor Yellow
    Write-Host "Please install Git from: https://git-scm.com/download/win" -ForegroundColor Cyan
    Write-Host "Or run: winget install Git.Git" -ForegroundColor Cyan
    Write-Host ""
    $installGit = Read-Host "Press Enter after installing Git, or 'q' to quit"
    if ($installGit -eq 'q') { exit 1 }
}

# Set Flutter installation path
$flutterPath = "C:\flutter"
$flutterBinPath = "$flutterPath\bin"

# Check if Flutter directory already exists
if (Test-Path $flutterPath) {
    Write-Host "Flutter directory already exists at $flutterPath" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to reinstall? (y/n)"
    if ($overwrite -ne 'y') {
        Write-Host "Skipping Flutter installation." -ForegroundColor Yellow
    }
    else {
        Write-Host "Removing existing Flutter installation..." -ForegroundColor Yellow
        Remove-Item -Path $flutterPath -Recurse -Force
    }
}

# Install Flutter
if (-not (Test-Path $flutterPath)) {
    Write-Host ""
    Write-Host "Installing Flutter to $flutterPath..." -ForegroundColor Yellow
    Write-Host "This may take a few minutes..." -ForegroundColor Yellow
    Write-Host ""
    
    try {
        git clone https://github.com/flutter/flutter.git -b stable $flutterPath
        Write-Host "Flutter cloned successfully!" -ForegroundColor Green
    }
    catch {
        Write-Host "Error cloning Flutter: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Alternative: Please download Flutter manually from:" -ForegroundColor Cyan
        Write-Host "https://docs.flutter.dev/get-started/install/windows" -ForegroundColor Cyan
        Write-Host "Extract to: $flutterPath" -ForegroundColor Cyan
        exit 1
    }
}

# Add Flutter to PATH
Write-Host ""
Write-Host "Adding Flutter to PATH..." -ForegroundColor Yellow

$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -notlike "*$flutterBinPath*") {
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$flutterBinPath", "User")
    Write-Host "Flutter added to PATH!" -ForegroundColor Green
}
else {
    Write-Host "Flutter already in PATH." -ForegroundColor Green
}

# Refresh PATH in current session
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

# Verify Flutter installation
Write-Host ""
Write-Host "Verifying Flutter installation..." -ForegroundColor Yellow
try {
    & "$flutterBinPath\flutter.bat" --version
    Write-Host ""
    Write-Host "Flutter installed successfully!" -ForegroundColor Green
}
catch {
    Write-Host "Error: Flutter command not found. Please restart your terminal and try again." -ForegroundColor Red
    Write-Host "Or manually add $flutterBinPath to your PATH." -ForegroundColor Yellow
    exit 1
}

# Run flutter doctor
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Running Flutter Doctor..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will check for required dependencies." -ForegroundColor Yellow
Write-Host ""

& "$flutterBinPath\flutter.bat" doctor

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Install any missing dependencies shown above" -ForegroundColor White
Write-Host "2. For Android: Install Android Studio from https://developer.android.com/studio" -ForegroundColor White
Write-Host "3. Accept Android licenses: flutter doctor --android-licenses" -ForegroundColor White
Write-Host "4. Restart your terminal/PowerShell" -ForegroundColor White
Write-Host "5. Navigate to mobile/ directory and run: flutter pub get" -ForegroundColor White
Write-Host ""















