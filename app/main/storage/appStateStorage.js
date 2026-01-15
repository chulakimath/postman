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
 */

const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

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
 * Save application state
 * @param {Object} state - State to persist
 */
const saveState = async (state) => {
  await ensureDir();
  
  const statePath = getStatePath();
  const tempPath = `${statePath}.tmp`;
  
  // Add metadata
  const stateWithMeta = {
    ...state,
    savedAt: Date.now(),
    version: 1, // For future migrations
  };
  
  // Atomic write
  await fs.writeFile(tempPath, JSON.stringify(stateWithMeta, null, 2), 'utf-8');
  await fs.rename(tempPath, statePath);
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
