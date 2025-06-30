#!/bin/bash

echo "🐛 Building CHRONOCOP in DEBUG mode..."

# Set debug environment variable
export CHRONOCOP_DEBUG=1

# Build the Flask server first
echo "📦 Building Flask server..."
python build-standalone.py

# Check if Flask build was successful
if [ $? -ne 0 ]; then
    echo "❌ Flask build failed!"
    exit 1
fi

# Build Electron app
echo "⚡ Building Electron app with debug logging..."
npm run build

# Check if Electron build was successful
if [ $? -ne 0 ]; then
    echo "❌ Electron build failed!"
    exit 1
fi

echo "✅ Debug build complete!"
echo ""
echo "🔍 To run with debug mode:"
echo "  CHRONOCOP_DEBUG=1 ./dist/mac-arm64/CHRONOCOP.app/Contents/MacOS/CHRONOCOP"
echo ""
echo "📝 This will:"
echo "  - Show developer tools automatically"
echo "  - Enable enhanced console logging"
echo "  - Show Flask server output"
echo "  - Add debugging menu items" 