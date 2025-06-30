const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Example: you can add Electron-specific functionality here
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // App information
  getVersion: () => ipcRenderer.invoke('get-version'),
  
  // Window controls (if you want to add custom title bar later)
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // Platform detection
  platform: process.platform,
  
  // Check if running in Electron
  isElectron: true
});

// Expose a flag so the web app knows it's running in Electron
window.isElectron = true;
window.electronPlatform = process.platform; 