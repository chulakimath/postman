/**
 * Window Manager
 * 
 * Handles creation and management of the main application window.
 * Responsibilities:
 * - Create window with secure settings
 * - Load the appropriate URL (dev server or production build)
 * - Manage window state (size, position)
 */

const { BrowserWindow } = require('electron');
const path = require('path');

// Store reference to main window
let mainWindow = null;

/**
 * Check if we're running in development mode
 * In dev mode, we load from Vite dev server
 * In production, we load from built files
 */
const isDev = () => {
  return !require('electron').app.isPackaged;
};

/**
 * Create the main application window
 * 
 * Security settings explained:
 * - nodeIntegration: false - Prevents renderer from accessing Node.js APIs directly
 * - contextIsolation: true - Isolates preload script from renderer context
 * - preload: Secure bridge between main and renderer processes
 */
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    
    // Window appearance
    backgroundColor: '#1a1a1a', // Dark background to prevent flash
    title: 'Postman Desktop',
    
    // Security settings (VERY IMPORTANT)
    webPreferences: {
      nodeIntegration: false,        // Never allow direct Node access
      contextIsolation: true,        // Isolate contexts for security
      sandbox: true,                 // Additional sandboxing
      preload: path.join(__dirname, '..', 'preload', 'bridge.js'),
    },
  });

  // Load the app
  if (isDev()) {
    // Development: Load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // Production: Load from built files
    // __dirname is app/main/window/, need to go to app/renderer/dist/
    mainWindow.loadFile(path.join(__dirname, '..', '..', 'renderer', 'dist', 'index.html'));
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
};

/**
 * Get the main window instance
 * Useful for sending messages to renderer from main process
 */
const getMainWindow = () => mainWindow;

module.exports = {
  createWindow,
  getMainWindow,
};
