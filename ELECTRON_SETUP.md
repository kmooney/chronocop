# CHRONOCOP Electron Setup Guide

This guide will help you package CHRONOCOP as a standalone desktop application using Electron.

## Prerequisites

1. **Node.js** (v16 or higher) - Download from [nodejs.org](https://nodejs.org/)
2. **Python** (already have this for Flask)
3. **Git** (if not already installed)

## Setup Steps

### 1. Install Node.js Dependencies

```bash
npm install
```

This will install all the required Electron dependencies listed in `package.json`.

### 2. Create Application Icons

You'll need to create icons in different formats for different platforms:

- **Windows**: `assets/icon.ico` (256x256 ICO file)
- **macOS**: `assets/icon.icns` (512x512 ICNS file) 
- **Linux**: `assets/icon.png` (512x512 PNG file)

**Icon Creation Tips:**
- Use a cyberpunk-themed icon that matches CHRONOCOP's aesthetic
- Tools like [GIMP](https://www.gimp.org/), [IconConverter](https://iconverticons.com/online/), or online generators work well
- Make sure the icon looks good at small sizes (16x16, 32x32)

### 3. Activate Virtual Environment

Make sure your Python virtual environment is set up and has the required dependencies:

```bash
# Activate virtual environment (if not already active)
source venv/bin/activate  # On macOS/Linux
# OR
venv\Scripts\activate     # On Windows

# Install Python dependencies
pip install -r requirements.txt
```

### 4. Development Mode

To run CHRONOCOP in Electron during development:

```bash
npm run electron-dev
```

This will:
- Automatically detect and use your virtual environment Python
- Start the Flask server on port 31337 (automatically finds free port)
- Wait for it to be ready
- Launch Electron with your app

**Alternative commands:**
```bash
# Run just the Flask server (for testing)
npm run flask-only

# Run Electron pointing to existing Flask instance
npm run electron
```

### 5. Building for Distribution

**Two-step build process:**
1. First, build the standalone Flask server executable
2. Then, build the Electron application

#### Build for your current platform:
```bash
npm run build
```
This automatically runs both steps: `npm run build-flask && electron-builder`

#### Build for specific platforms:
```bash
# macOS
npm run build-mac

# Windows 
npm run build-win

# Linux
npm run build-linux
```

#### Build for all platforms:
```bash
npm run dist
```

#### Manual step-by-step build:
```bash
# Step 1: Build Flask executable
npm run build-flask

# Step 2: Build Electron app
npx electron-builder
```

The built applications will be in the `dist/` folder.

## File Structure

```
your-project/
├── electron/
│   ├── main.js          # Main Electron process
│   └── preload.js       # Preload script for security
├── assets/
│   ├── icon.png         # Linux icon
│   ├── icon.ico         # Windows icon
│   └── icon.icns        # macOS icon
├── app/                 # Your Flask application
├── package.json         # Electron configuration
└── run.py              # Modified to accept port from env
```

## Configuration Details

### Window Settings
The Electron window is configured with:
- **Size**: 1400x900 (minimum 1200x700)
- **No menu bar** for cleaner interface
- **Dark background** matching cyberpunk theme
- **Security**: Context isolation enabled

### Flask Integration
- Automatically finds free port (31337-31400 range)
- Uses your existing virtual environment in development
- Uses standalone executable for distribution builds (completely self-contained)
- Gracefully shuts down Flask when app closes
- No external dependencies (uses built-in Node.js modules)
- PyInstaller creates single executable with all dependencies bundled

## Distribution

### System Requirements for End Users
**CHRONOCOP is completely self-contained - no additional software required!**

Users simply need to:
1. **Download and install** the application
2. **Launch and enjoy** - everything is bundled!

### Package Sizes (Approximate)
- **Windows**: ~120-150MB (includes Python runtime)
- **macOS**: ~100-130MB 
- **Linux**: ~110-140MB

**Note:** Larger than before, but completely self-contained with no external dependencies.

### Installation Files Created
- **Windows**: NSIS installer (.exe)
- **macOS**: DMG disk image (.dmg)
- **Linux**: AppImage (.AppImage)

## Troubleshooting

### Common Issues

1. **Flask won't start**
   - Check that your virtual environment is properly set up
   - Ensure all dependencies in `requirements.txt` are installed

2. **Icon not showing**
   - Make sure icon files exist in `assets/` folder
   - Check file formats are correct (.ico for Windows, .icns for macOS, .png for Linux)

3. **Build fails**
   - Run `npm install` again
   - Check Node.js version is 16+
   - Clear `node_modules` and reinstall if needed

4. **App won't launch after building**
   - Test in development mode first (`npm run electron-dev`)
   - Check console for error messages

### Development Tips

- Use `npm run electron-dev` for testing changes
- The Flask server logs appear in the Electron console
- Hot reloading is enabled in development mode
- Window size/position preferences could be saved to user data

## Advanced Customization

### Adding Auto-Updates
You can add auto-update functionality using `electron-updater`. This requires:
- Code signing certificates
- Update server setup
- Modify `package.json` build configuration

### Custom Menus
To add application menus, modify `electron/main.js`:
```javascript
const template = [
  {
    label: 'File',
    submenu: [
      { role: 'quit' }
    ]
  }
];
const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
```

### Notification Integration
CHRONOCOP's time tracking alarms will work as system notifications in the Electron app automatically.

## Security Notes

- The preload script provides secure communication between Electron and your web app
- External links open in the default browser, not within the app
- Node.js integration is disabled in the renderer for security
- Context isolation is enabled

---

**Ready to build your cyberpunk time tracker desktop app!** 🚀⚡ 