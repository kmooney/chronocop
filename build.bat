@echo off

REM CHRONOCOP Electron Build Script for Windows

echo 🚀 Building CHRONOCOP Electron App...

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed. Please install Python from https://python.org/
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm dependencies are installed
if not exist "node_modules" (
    echo 📦 Installing npm dependencies...
    npm install
)

REM Check if icon files exist
if not exist "assets\icon.png" (
    echo ⚠️  Warning: Missing icon files. Consider creating proper icons for better branding.
)

REM Build Flask executable first
echo 🐍 Building standalone Flask server...
python build-standalone.py
if %errorlevel% neq 0 (
    echo ❌ Failed to build Flask executable
    pause
    exit /b 1
)

REM Build Electron app
echo 🔨 Building Electron application...
npm run build

echo ✅ Build complete! Check the 'dist' folder for your application.
echo 📱 To run in development mode: npm run electron-dev
echo 🎯 To build for all platforms: npm run dist
pause 