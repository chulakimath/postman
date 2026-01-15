/**
 * IPC Handlers
 * 
 * This module registers all IPC (Inter-Process Communication) handlers.
 * Each handler responds to a specific channel from the renderer process.
 * 
 * Pattern: 'namespace:action' (e.g., 'collections:list')
 * 
 * All handlers use ipcMain.handle() which:
 * - Receives async requests from renderer
 * - Can return values (resolved to renderer)
 * - Supports async/await
 */

const collectionStorage = require('../storage/collectionStorage');
const requestExecutor = require('../http/requestExecutor');
const appStateStorage = require('../storage/appStateStorage');

/**
 * Register all IPC handlers
 * @param {Electron.IpcMain} ipcMain - Electron IPC main instance
 */
const registerHandlers = (ipcMain) => {
  // ==========================================
  // Collection Handlers
  // ==========================================
  
  /**
   * List all collections
   * Returns array of collection objects
   */
  ipcMain.handle('collections:list', async () => {
    try {
      const collections = await collectionStorage.getAllCollections();
      return { success: true, data: collections };
    } catch (error) {
      console.error('Error listing collections:', error);
      return { success: false, error: error.message };
    }
  });
  
  /**
   * Create a new collection
   * @param {Object} data - { name: string }
   */
  ipcMain.handle('collections:create', async (event, data) => {
    try {
      const collection = await collectionStorage.createCollection(data);
      return { success: true, data: collection };
    } catch (error) {
      console.error('Error creating collection:', error);
      return { success: false, error: error.message };
    }
  });
  
  /**
   * Update an existing collection
   * @param {string} id - Collection ID
   * @param {Object} data - Updated data
   */
  ipcMain.handle('collections:update', async (event, id, data) => {
    try {
      const collection = await collectionStorage.updateCollection(id, data);
      return { success: true, data: collection };
    } catch (error) {
      console.error('Error updating collection:', error);
      return { success: false, error: error.message };
    }
  });
  
  /**
   * Delete a collection
   * @param {string} id - Collection ID
   */
  ipcMain.handle('collections:delete', async (event, id) => {
    try {
      await collectionStorage.deleteCollection(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting collection:', error);
      return { success: false, error: error.message };
    }
  });

  // ==========================================
  // Request Execution Handler
  // ==========================================
  
  /**
   * Execute an HTTP request
   * @param {Object} request - Full request configuration
   */
  ipcMain.handle('request:execute', async (event, request) => {
    try {
      const response = await requestExecutor.execute(request);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error executing request:', error);
      return { 
        success: false, 
        error: error.message,
        // Include additional error info for debugging
        details: {
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText,
        }
      };
    }
  });

  // ==========================================
  // App State Handlers
  // ==========================================
  
  /**
   * Save application state
   * @param {Object} state - State to persist
   */
  ipcMain.handle('app:saveState', async (event, state) => {
    try {
      await appStateStorage.saveState(state);
      return { success: true };
    } catch (error) {
      console.error('Error saving app state:', error);
      return { success: false, error: error.message };
    }
  });
  
  /**
   * Load application state
   */
  ipcMain.handle('app:loadState', async () => {
    try {
      const state = await appStateStorage.loadState();
      return { success: true, data: state };
    } catch (error) {
      console.error('Error loading app state:', error);
      return { success: false, error: error.message };
    }
  });
};

module.exports = {
  registerHandlers,
};
