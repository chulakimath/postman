/**
 * App State Storage
 * 
 * Persists application UI state between sessions.
 * This includes:
 * - Active collection/request
 * - Open tabs
 * - UI preferences (sidebar width, etc.)
 * 
 * This allows users to pick up exactly where they left off.
 * 
 * CRITICAL: Write operations are tracked to ensure completion before app quit.
 */

const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');
const { trackOperation } = require('../utils/pendingOperations');

/**
 * Get the path to the state file
 */
const getStatePath = () => {
  const isDev = !app.isPackaged;
  
  if (isDev) {
    return path.join(__dirname, '..', '..', '..', 'storage', 'app-state.json');
  }
  
  return path.join(app.getPath('userData'), 'storage', 'app-state.json');
};

/**
 * Ensure the storage directory exists
 */
const ensureDir = async () => {
  const statePath = getStatePath();
  const dir = path.dirname(statePath);
  
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
};

/**
 * Atomic write helper
 * @param {string} filePath - Target file path
 * @param {Object} data - Data to write
 */
const atomicWrite = async (filePath, data) => {
  const tempPath = `${filePath}.tmp`;
  const content = JSON.stringify(data, null, 2);
  
  await fs.writeFile(tempPath, content, 'utf-8');
  await fs.rename(tempPath, filePath);
};

/**
 * Save application state
 * TRACKED: This operation is tracked to ensure completion before app quit
 * @param {Object} state - State to persist
 */
const saveState = async (state) => {
  await ensureDir();
  
  const statePath = getStatePath();
  
  // Add metadata
  const stateWithMeta = {
    ...state,
    savedAt: Date.now(),
    version: 1, // For future migrations
  };
  
  // Track this write operation for shutdown handling
  const writeOperation = atomicWrite(statePath, stateWithMeta);
  trackOperation(writeOperation);
  await writeOperation;
};

/**
 * Load previously saved state
 * @returns {Promise<Object|null>} Saved state or null
 */
const loadState = async () => {
  try {
    const statePath = getStatePath();
    const content = await fs.readFile(statePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null; // No saved state yet
    }
    
    // Log error but don't crash - return null to use defaults
    console.error('Error loading app state:', error);
    return null;
  }
};

module.exports = {
  saveState,
  loadState,
};
