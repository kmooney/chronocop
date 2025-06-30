#!/bin/bash

echo "⚡ CHRONOCOP Startup Speed Test"
echo "================================"
echo ""

# Check if app exists
APP_PATH="./dist/mac-arm64/CHRONOCOP.app"
if [ ! -d "$APP_PATH" ]; then
    echo "❌ CHRONOCOP.app not found at $APP_PATH"
    echo "Please run 'npm run build' first"
    exit 1
fi

# Kill any existing CHRONOCOP processes
echo "🧹 Cleaning up existing processes..."
killall CHRONOCOP 2>/dev/null || true
killall chronocop-server 2>/dev/null || true
sleep 1

echo "🎬 Starting CHRONOCOP with timing..."
echo ""

# Start timing (use gdate if available for milliseconds, otherwise seconds)
if command -v gdate > /dev/null; then
    START_TIME=$(gdate +%s%3N)
    USE_MS=true
else
    START_TIME=$(date +%s)
    USE_MS=false
fi

# Launch CHRONOCOP with debug output
CHRONOCOP_DEBUG=1 "$APP_PATH/Contents/MacOS/CHRONOCOP" &
PID=$!

echo "🆔 Process ID: $PID"
echo "⏱️  Start time: $(date)"
echo ""

# Wait for Flask server to be responding
echo "🔍 Waiting for Flask server to respond..."
ATTEMPTS=0
MAX_ATTEMPTS=30

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    if curl -s http://127.0.0.1:31337 > /dev/null 2>&1; then
        if [ "$USE_MS" = "true" ]; then
            END_TIME=$(gdate +%s%3N)
            DURATION=$((END_TIME - START_TIME))
            TIME_UNIT="ms"
            COMPARE_DURATION=$DURATION
        else
            END_TIME=$(date +%s)
            DURATION=$((END_TIME - START_TIME))
            TIME_UNIT="s"
            COMPARE_DURATION=$((DURATION * 1000))  # Convert to ms for comparison
        fi
        
        echo "✅ Flask server is responding!"
        echo "⚡ Total startup time: ${DURATION}${TIME_UNIT}"
        echo ""
        
        if [ $COMPARE_DURATION -lt 2000 ]; then
            echo "🚀 EXCELLENT: Under 2 seconds!"
        elif [ $COMPARE_DURATION -lt 5000 ]; then
            echo "👍 GOOD: Under 5 seconds"
        else
            echo "🐌 SLOW: Over 5 seconds (old system was ~8 seconds)"
        fi
        
        echo ""
        echo "📊 Performance Comparison:"
        echo "  • Old system (fixed 5s delay): ~8000ms"
        echo "  • New system (health check):   ${COMPARE_DURATION}ms"
        if [ $COMPARE_DURATION -lt 8000 ]; then
            echo "  • Improvement: $((8000 - COMPARE_DURATION))ms faster"
        fi
        echo ""
        echo "🎉 CHRONOCOP is now ready!"
        echo "🛑 To stop: kill $PID"
        
        exit 0
    fi
    
    ATTEMPTS=$((ATTEMPTS + 1))
    sleep 0.5
done

echo "❌ Timeout: Flask server didn't respond after 15 seconds"
echo "🛑 Killing process $PID"
kill $PID 2>/dev/null || true
exit 1 