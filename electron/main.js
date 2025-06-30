const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const net = require('net');
const http = require('http');

let mainWindow;
let flaskProcess;
let flaskPort = 31337;

// Function to find a free port using built-in Node.js modules
function findFreePort(startPort = 31337, endPort = 31400) {
  return new Promise((resolve, reject) => {
    function testPort(port) {
      if (port > endPort) {
        reject(new Error('No free port found in range'));
        return;
      }
      
      const server = net.createServer();
      server.listen(port, (err) => {
        if (err) {
          server.close();
          testPort(port + 1);
        } else {
          server.close(() => {
            resolve(port);
          });
        }
      });
      
      server.on('error', () => {
        testPort(port + 1);
      });
    }
    
    testPort(startPort);
  });
}

// Enable live reload for development
if (process.env.NODE_ENV === 'development') {
  require('electron-reload')(__dirname, {
    electron: require(`${__dirname}/../node_modules/electron`),
    hardResetMethod: 'exit'
  });
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    title: 'CHRONOCOP',
    titleBarStyle: 'default',
    show: false, // Don't show until ready
    backgroundColor: '#0a0a0a' // Dark background matching the app
  });

  // Enable DevTools in development or if CHRONOCOP_DEBUG is set
  if (!app.isPackaged || process.env.CHRONOCOP_DEBUG) {
    mainWindow.webContents.openDevTools();
  }

  // Create menu for debugging
  const template = [
    {
      label: 'CHRONOCOP',
      submenu: [
        {
          label: 'Open Developer Tools',
          accelerator: 'F12',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.openDevTools();
            }
          }
        },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) {
              mainWindow.reload();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Load the Flask app (server is already verified healthy)
  const loadApp = () => {
    const url = `http://127.0.0.1:${flaskPort}`;
    console.log(`🌐 Loading CHRONOCOP app: ${url}`);
    mainWindow.loadURL(url);
  };

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Focus on window
    if (process.platform === 'darwin') {
      app.dock.show();
    }
    mainWindow.focus();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load the app immediately (Flask is already healthy)
  loadApp();
}

function startFlaskServer() {
  return new Promise(async (resolve, reject) => {
    try {
      // Find a free port
      flaskPort = await findFreePort(31337, 31400);
      console.log(`🔍 Using port: ${flaskPort}`);

      // Determine executable path
      let executablePath;
      let workingDir;
      let args = [];
      
      if (app.isPackaged) {
        // In production, use bundled standalone executable
        const exeName = process.platform === 'win32' ? 'chronocop-server.exe' : 'chronocop-server';
        executablePath = path.join(process.resourcesPath, exeName);
        workingDir = process.resourcesPath;
        console.log(`📦 Using bundled executable: ${executablePath}`);
      } else {
        // In development, use Python script
        executablePath = path.join(__dirname, '../venv/bin/python');
        if (process.platform === 'win32') {
          executablePath = path.join(__dirname, '../venv/Scripts/python.exe');
        }
        args = [path.join(__dirname, '../run.py')];
        workingDir = path.join(__dirname, '..');
        console.log(`🐍 Using development Python: ${executablePath}`);
      }

      console.log(`🚀 Starting Flask server: ${executablePath}`);
      console.log(`📁 Working directory: ${workingDir}`);

      flaskProcess = spawn(executablePath, args, {
        env: {
          ...process.env,
          FLASK_PORT: flaskPort.toString(),
          PORT: flaskPort.toString(), // Backup for compatibility
          FLASK_ENV: app.isPackaged ? 'production' : 'development'
        },
        cwd: workingDir
      });

      flaskProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          console.log(`🟢 [Flask stdout] ${output}`);
        }
      });

      flaskProcess.stderr.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          console.error(`🔴 [Flask stderr] ${output}`);
        }
      });

      flaskProcess.on('close', (code) => {
        console.log(`🔴 Flask process exited with code ${code}`);
        if (code !== 0 && app.isPackaged) {
          dialog.showErrorBox(
            'Server Error', 
            'CHRONOCOP server encountered an error and stopped.\n\n' +
            'Please try restarting the application.\n\n' +
            'If the problem persists, please contact support.'
          );
        }
      });

      flaskProcess.on('error', (error) => {
        console.error('❌ Failed to start Flask process:', error);
        if (app.isPackaged) {
          dialog.showErrorBox(
            'Server Startup Failed',
            'CHRONOCOP could not start the built-in server.\n\n' +
            'This may be due to a corrupted installation.\n\n' +
            'Please try reinstalling the application.'
          );
        }
        reject(error);
        return;
      });

      // Start health checking immediately
      console.log(`🔍 Starting health check for http://127.0.0.1:${flaskPort}`);
      startHealthCheck(resolve, reject);
      
    } catch (error) {
      console.error('❌ Error starting Flask server:', error);
      // Fallback to default port
      flaskPort = 31337;
      reject(error);
    }
  });
}

function startHealthCheck(resolve, reject) {
  let attempts = 0;
  const maxAttempts = 30; // 30 attempts over 15 seconds max
  const healthCheckInterval = 500; // Check every 500ms
  
  const checkHealth = () => {
    attempts++;
    const url = `http://127.0.0.1:${flaskPort}`;
    
    console.log(`💓 Health check attempt ${attempts}/${maxAttempts}: ${url}`);
    
    const request = http.get(url, (response) => {
      if (response.statusCode === 200) {
        console.log(`✅ Flask server is healthy! Ready in ${attempts * healthCheckInterval}ms`);
        resolve();
      } else {
        console.log(`⚠️  Flask responded with status ${response.statusCode}, retrying...`);
        scheduleNextCheck();
      }
    });
    
    request.on('error', (error) => {
      if (attempts >= maxAttempts) {
        console.error(`❌ Health check failed after ${maxAttempts} attempts: ${error.message}`);
        reject(new Error(`Flask server failed to start after ${maxAttempts * healthCheckInterval}ms`));
      } else {
        scheduleNextCheck();
      }
    });
    
    request.setTimeout(2000, () => {
      request.destroy();
      if (attempts < maxAttempts) {
        scheduleNextCheck();
      }
    });
  };
  
  const scheduleNextCheck = () => {
    if (attempts < maxAttempts) {
      setTimeout(checkHealth, healthCheckInterval);
    }
  };
  
  // Start the first check immediately
  checkHealth();
}

function stopFlaskServer() {
  if (flaskProcess) {
    flaskProcess.kill();
    flaskProcess = null;
  }
}

// App event handlers
app.whenReady().then(async () => {
  try {
    console.log('🎬 CHRONOCOP starting up...');
    await startFlaskServer();
    console.log('🎉 Flask server is healthy, creating window...');
    createWindow();
  } catch (error) {
    console.error('❌ Failed to start Flask server:', error);
    
    // Show detailed error information in development
    const errorMessage = app.isPackaged 
      ? 'Failed to start the application server.'
      : `Failed to start Flask server: ${error.message}\n\nCheck the terminal for more details.`;
    
    dialog.showErrorBox('CHRONOCOP Startup Error', errorMessage);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopFlaskServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopFlaskServer();
});

// Handle certificate errors (for development)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (url.startsWith('http://localhost')) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
}); 