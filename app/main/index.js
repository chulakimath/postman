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
 * 
 * CRITICAL: Properly handles app shutdown to ensure all pending
 * write operations complete before quit.
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Import our modular components
const { createWindow, getMainWindow } = require('./window/windowManager');
const { registerHandlers } = require('./ipc/handlers');
const { waitForPending, hasPending } = require('./utils/pendingOperations');

// Track if we're in the process of quitting
let isQuitting = false;

/**
 * Application Initialization
 * 
 * Electron apps go through a lifecycle:
 * 1. 'ready' - App is initialized, safe to create windows
 * 2. 'window-all-closed' - All windows closed
 * 3. 'activate' - macOS dock icon clicked
 * 4. 'before-quit' - App is about to quit
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

/**
 * Handle window close event
 * Prevents immediate close if there are pending operations
 */
app.on('browser-window-created', (event, window) => {
  window.on('close', async (e) => {
    // If we're already in the quitting process, allow close
    if (isQuitting) return;
    
    // Check if there are pending operations
    if (hasPending()) {
      e.preventDefault();
      
      console.log('Waiting for pending operations before close...');
      
      // Wait for pending operations to complete
      await waitForPending(5000);
      
      // Now close the window
      isQuitting = true;
      window.close();
    }
  });
});

/**
 * Handle before-quit event
 * This is called when the app is about to quit
 * We wait for all pending operations to complete
 */
app.on('before-quit', async (e) => {
  // If we've already handled this, allow quit
  if (isQuitting) return;
  
  // Check if there are pending operations
  if (hasPending()) {
    e.preventDefault();
    
    console.log('Waiting for pending operations before quit...');
    
    // Wait for all pending operations with 10 second timeout
    const completed = await waitForPending(10000);
    
    if (!completed) {
      console.error('Some operations may not have completed - forcing quit');
    }
    
    // Now allow the app to quit
    isQuitting = true;
    app.quit();
  }
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', async () => {
  // macOS apps typically stay active until Cmd+Q
  if (process.platform !== 'darwin') {
    // Wait for pending operations before quitting
    if (hasPending()) {
      console.log('Waiting for pending operations before quit...');
      await waitForPending(10000);
    }
    app.quit();
  }
});

// Handle any uncaught exceptions gracefully
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // In production, you might want to log this and show a friendly error
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
