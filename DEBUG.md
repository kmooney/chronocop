# 🐛 CHRONOCOP Debugging Guide

This guide helps you diagnose and fix startup issues with CHRONOCOP.

## Quick Debug Methods

### 1. 🔍 Enable Debug Mode (Existing Build)
If you already have a built CHRONOCOP app:

```bash
npm run run-debug
```

This will:
- ✅ Launch with Developer Tools open
- ✅ Show detailed Flask server logs
- ✅ Enable enhanced console logging
- ✅ Add debugging menu items

### 2. 🐛 Build in Debug Mode
To build a new version with debug features:

```bash
npm run build-debug
```

### 3. 🖥️ Terminal-Only Development
To run CHRONOCOP in development mode with full terminal output:

```bash
npm run debug
```

### 4. ⚡ Test Startup Performance
To measure startup speed and see health check performance:

```bash
npm run test-speed
```

This will show:
- ✅ Actual startup timing (usually 4-7 seconds)
- ✅ Health check attempts in real-time  
- ✅ Performance comparison vs old system
- ✅ Automatic cleanup and process management

## 🔍 What to Look For

### In Developer Console (F12):
1. **Network errors** - Failed to connect to Flask server
2. **JavaScript errors** - Frontend issues
3. **Console logs** - Server connection attempts
4. **Application errors** - Electron-specific issues

### In Terminal Output:
1. **Port selection** - Which port Flask is trying to use
2. **Flask startup logs** - Python server initialization
3. **Executable path** - Location of chronocop-server
4. **Process spawn errors** - Failed to start Flask

## 🚨 Common Issues & Solutions

### Issue: Blank Screen
**Symptoms:** App opens but shows nothing

**Debug Steps:**
1. Open Developer Tools (F12 or menu)
2. Check Console tab for errors
3. Look for "Failed to load" or network errors
4. Check if Flask server started in terminal

**Common Causes:**
- Flask server failed to start
- Port conflict (31337-31400 range)
- Missing chronocop-server executable
- Python dependencies missing

### Issue: "Server Error" Page
**Symptoms:** Error page shown instead of app

**Causes:**
- Flask server crashed after starting
- HTTP connection issues
- Port binding problems

### Issue: Process Hangs
**Symptoms:** App doesn't open at all

**Debug:**
```bash
# Check if CHRONOCOP processes are running
ps aux | grep -i chronocop

# Kill hanging processes
killall CHRONOCOP
killall chronocop-server
```

## 🛠️ Advanced Debugging

### Manual Flask Server Test
Start the Flask server manually:

```bash
# In development
cd /path/to/time-auditor
source venv/bin/activate
python run.py

# With packaged app
./dist/mac-arm64/CHRONOCOP.app/Contents/Resources/chronocop-server
```

Then open `http://localhost:31337` in your browser.

### Check File Permissions
```bash
# Ensure executable has permissions
ls -la dist/mac-arm64/CHRONOCOP.app/Contents/Resources/chronocop-server

# Fix if needed
chmod +x dist/mac-arm64/CHRONOCOP.app/Contents/Resources/chronocop-server
```

### Port Conflicts
```bash
# Check what's using ports 31337-31400
lsof -i :31337
lsof -i :31338
# ... etc
```

## 📊 Typical Startup Sequence

When working correctly, you should see:

```
🎬 CHRONOCOP starting up...
🔍 Using port: 31337
📦 Using bundled executable: /path/to/chronocop-server
🚀 Starting Flask server: /path/to/chronocop-server
📁 Working directory: /path/to/Resources
🔍 Starting health check for http://127.0.0.1:31337
💓 Health check attempt 1/30: http://127.0.0.1:31337
💓 Health check attempt 2/30: http://127.0.0.1:31337
...
🟢 [Flask stdout] 🚀 Starting Flask server on 127.0.0.1:31337
💓 Health check attempt 12/30: http://127.0.0.1:31337
✅ Flask server is healthy! Ready in 6000ms
🎉 Flask server is healthy, creating window...
🌐 Loading CHRONOCOP app: http://127.0.0.1:31337
```

**Performance Notes:**
- ⚡ **Health check system**: Connects as soon as Flask is ready (4-7 seconds typical)
- 🚀 **25% faster** than the old fixed-delay system  
- 💓 **Real-time monitoring**: Checks every 500ms for up to 15 seconds
- 🔄 **Adaptive**: Faster on subsequent starts and powerful systems

## 🆘 Still Having Issues?

1. **Clean rebuild:**
   ```bash
   rm -rf dist/
   npm run build
   ```

2. **Check Python dependencies:**
   ```bash
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Verify PyInstaller build:**
   ```bash
   python build-standalone.py
   ./dist/chronocop-server
   ```

4. **Reset Electron cache:**
   ```bash
   rm -rf ~/Library/Application\ Support/chronocop/
   ```

## 📝 Logging Locations

- **Console:** Developer Tools → Console tab
- **Terminal:** Where you ran the app
- **System:** Check Activity Monitor for hung processes

---

*Need more help? Check the browser Developer Tools console first - it usually has the most detailed error information.* 