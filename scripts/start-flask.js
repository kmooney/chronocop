#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Determine the correct Python executable path
function getPythonPath() {
  const isWindows = process.platform === 'win32';
  
  // Try virtual environment first
  const venvPython = isWindows 
    ? path.join(__dirname, '../venv/Scripts/python.exe')
    : path.join(__dirname, '../venv/bin/python');
  
  if (fs.existsSync(venvPython)) {
    return venvPython;
  }
  
  // Fallback to system Python
  console.log('⚠️  Virtual environment not found, using system Python');
  return isWindows ? 'python.exe' : 'python3';
}

// Start Flask server
function startFlask() {
  const pythonPath = getPythonPath();
  const runScript = path.join(__dirname, '../run.py');
  
  console.log(`🐍 Starting Flask with: ${pythonPath}`);
  
  const flaskProcess = spawn(pythonPath, [runScript], {
    env: {
      ...process.env,
      FLASK_PORT: '31337',
      FLASK_ENV: 'development'
    },
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  
  flaskProcess.on('error', (error) => {
    console.error('❌ Failed to start Flask:', error.message);
    process.exit(1);
  });
  
  flaskProcess.on('close', (code) => {
    console.log(`Flask process exited with code ${code}`);
    process.exit(code);
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Flask...');
    flaskProcess.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    flaskProcess.kill('SIGTERM');
  });
}

if (require.main === module) {
  startFlask();
} 