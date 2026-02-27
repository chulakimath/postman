/**
 * Preload Bridge Script
 * 
 * This script runs in an isolated context with access to both
 * Node.js APIs and the DOM. It creates a secure bridge between
 * the main process and renderer process.
 * 
 * SECURITY: Only expose specific, whitelisted methods.
 * Never expose raw ipcRenderer or Node.js APIs directly.
 * 
 * The renderer can access these via: window.api.methodName()
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose a secure API to the renderer process
 * 
 * These methods use ipcRenderer.invoke() which:
 * - Returns a Promise (async by nature)
 * - Waits for main process response
 * - Handles errors properly
 */
contextBridge.exposeInMainWorld('api', {
  // ==========================================
  // Collection Operations
  // ==========================================
  
  /**
   * Get all collections from storage
   * @returns {Promise<Array>} Array of collection objects
   */
  getCollections: () => {
    return ipcRenderer.invoke('collections:list');
  },
  
  /**
   * Create a new collection
   * @param {Object} data - Collection data { name: string }
   * @returns {Promise<Object>} Created collection
   */
  createCollection: (data) => {
    return ipcRenderer.invoke('collections:create', data);
  },
  
  /**
   * Update an existing collection
   * @param {string} id - Collection ID
   * @param {Object} data - Updated collection data
   * @returns {Promise<Object>} Updated collection
   */
  updateCollection: (id, data) => {
    return ipcRenderer.invoke('collections:update', id, data);
  },
  
  /**
   * Delete a collection
   * @param {string} id - Collection ID
   * @returns {Promise<boolean>} Success status
   */
  deleteCollection: (id) => {
    return ipcRenderer.invoke('collections:delete', id);
  },

  // ==========================================
  // Request Operations
  // ==========================================
  
  /**
   * Execute an HTTP request
   * @param {Object} request - Request configuration
   * @returns {Promise<Object>} Response data
   */
  executeRequest: (request) => {
    return ipcRenderer.invoke('request:execute', request);
  },

  // ==========================================
  // App State Persistence
  // ==========================================
  
  /**
   * Save application state (open tabs, active collection, etc.)
   * @param {Object} state - State to persist
   * @returns {Promise<boolean>} Success status
   */
  saveAppState: (state) => {
    return ipcRenderer.invoke('app:saveState', state);
  },
  
  /**
   * Load previously saved application state
   * @returns {Promise<Object|null>} Saved state or null
   */
  loadAppState: () => {
    return ipcRenderer.invoke('app:loadState');
  },

  // ==========================================
  // Persistence Management
  // ==========================================
  
  /**
   * Flush all pending write operations to disk
   * Call this before app close to ensure data is saved
   * @returns {Promise<Object>} { success: boolean, pendingCount: number }
   */
  flushPendingWrites: () => {
    return ipcRenderer.invoke('app:flushPending');
  },
  
  /**
   * Check if there are pending write operations
   * @returns {Promise<Object>} { hasPending: boolean, count: number }
   */
  checkPendingWrites: () => {
    return ipcRenderer.invoke('app:checkPending');
  },
});

// Log that preload script loaded successfully (dev only)
console.log('Preload bridge loaded successfully');
