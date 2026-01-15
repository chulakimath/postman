/**
 * Main Process Entry Point
 * 
 * This is the Electron main process that runs in Node.js environment.
 * It handles:
 * - Window creation and management
 * - IPC (Inter-Process Communication) with renderer
 * - File system operations
 * - Native system integrations
 * 
 * Security: We use contextIsolation and a preload script to
 * safely expose limited APIs to the renderer process.
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Import our modular components
const { createWindow, getMainWindow } = require('./window/windowManager');
const { registerHandlers } = require('./ipc/handlers');

/**
 * Application Initialization
 * 
 * Electron apps go through a lifecycle:
 * 1. 'ready' - App is initialized, safe to create windows
 * 2. 'window-all-closed' - All windows closed
 * 3. 'activate' - macOS dock icon clicked
 */

// Wait for Electron to be ready before creating windows
app.whenReady().then(() => {
  // Register all IPC handlers before creating window
  // This ensures handlers are ready when renderer loads
  registerHandlers(ipcMain);
  
  // Create the main application window
  createWindow();
  
  // macOS: Re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  // macOS apps typically stay active until Cmd+Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle any uncaught exceptions gracefully
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // In production, you might want to log this and show a friendly error
});
