#!/bin/bash

# CHRONOCOP Electron Build Script

echo "🚀 Building CHRONOCOP Electron App..."

# Check if Python is available
if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    echo "❌ Python is not installed. Please install Python from https://python.org/"
    exit 1
fi

# Check if we're in virtual environment
if [[ "$VIRTUAL_ENV" == "" ]]; then
    echo "⚠️  Warning: Not in a virtual environment. Consider running:"
    echo "   source venv/bin/activate"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
fi

# Check if icon files exist (warn if they're placeholders)
if [ ! -f "assets/icon.png" ] || grep -q "Placeholder" "assets/icon.png"; then
    echo "⚠️  Warning: Using placeholder icon files. Consider creating proper icons for better branding."
fi

# Build Flask executable first
echo "🐍 Building standalone Flask server..."
python build-standalone.py
if [ $? -ne 0 ]; then
    echo "❌ Failed to build Flask executable"
    exit 1
fi

# Build Electron app
echo "🔨 Building Electron application..."
npm run build

echo "✅ Build complete! Check the 'dist' folder for your application."
echo "📱 To run in development mode: npm run electron-dev"
echo "🎯 To build for all platforms: npm run dist" 