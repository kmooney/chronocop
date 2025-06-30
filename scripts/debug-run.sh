#!/bin/bash

echo "🔍 Launching CHRONOCOP in DEBUG mode..."
echo ""

# Check if the app exists
APP_PATH="./dist/mac-arm64/CHRONOCOP.app"
if [ ! -d "$APP_PATH" ]; then
    echo "❌ CHRONOCOP.app not found at $APP_PATH"
    echo "Please run 'npm run build' first"
    exit 1
fi

# Launch with debug mode enabled
echo "🚀 Starting with enhanced logging..."
CHRONOCOP_DEBUG=1 "$APP_PATH/Contents/MacOS/CHRONOCOP" &

# Show the process ID
PID=$!
echo "🆔 Process ID: $PID"
echo ""
echo "📝 Debug features enabled:"
echo "  - Developer Tools will open automatically"
echo "  - Enhanced console logging"
echo "  - Flask server output visible"
echo "  - Press F12 to toggle DevTools"
echo "  - Press Cmd+R to reload"
echo ""
echo "🛑 To stop: kill $PID or close the app" 