/**
 * Collection Storage
 * 
 * Handles file-based persistence of collections.
 * Each collection is stored as a separate JSON file.
 * 
 * Storage location: [app-path]/storage/collections/[id].json
 * 
 * Benefits of file-per-collection:
 * - Atomic saves (one collection won't corrupt another)
 * - Easy to backup/restore individual collections
 * - Better performance for large collections
 * - Future-ready for sync features
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { app } = require('electron');

/**
 * Get the storage directory path
 * Uses app.getPath('userData') for proper OS-specific location
 */
const getStorageDir = () => {
  // In development, use project directory
  // In production, use app data directory
  const isDev = !app.isPackaged;
  
  if (isDev) {
    return path.join(__dirname, '..', '..', '..', 'storage', 'collections');
  }
  
  return path.join(app.getPath('userData'), 'storage', 'collections');
};

/**
 * Ensure the storage directory exists
 */
const ensureStorageDir = async () => {
  const dir = getStorageDir();
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    // Directory might already exist, that's fine
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
};

/**
 * Get the file path for a collection
 * @param {string} id - Collection ID
 * @returns {string} Full file path
 */
const getCollectionPath = (id) => {
  return path.join(getStorageDir(), `${id}.json`);
};

/**
 * Get all collections
 * Reads all JSON files from storage directory
 * @returns {Promise<Array>} Array of collection objects
 */
const getAllCollections = async () => {
  await ensureStorageDir();
  
  const dir = getStorageDir();
  const files = await fs.readdir(dir);
  
  const collections = [];
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      try {
        const filePath = path.join(dir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const collection = JSON.parse(content);
        collections.push(collection);
      } catch (error) {
        console.error(`Error reading collection file ${file}:`, error);
        // Skip corrupted files, don't crash the app
      }
    }
  }
  
  // Sort by creation date (newest first)
  collections.sort((a, b) => b.createdAt - a.createdAt);
  
  return collections;
};

/**
 * Get a single collection by ID
 * @param {string} id - Collection ID
 * @returns {Promise<Object|null>} Collection or null if not found
 */
const getCollection = async (id) => {
  try {
    const filePath = getCollectionPath(id);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null; // File doesn't exist
    }
    throw error;
  }
};

/**
 * Create a new collection
 * @param {Object} data - { name: string }
 * @returns {Promise<Object>} Created collection
 */
const createCollection = async (data) => {
  await ensureStorageDir();
  
  const now = Date.now();
  
  const collection = {
    id: uuidv4(),
    name: data.name || 'New Collection',
    createdAt: now,
    updatedAt: now,
    requests: [],
  };
  
  const filePath = getCollectionPath(collection.id);
  
  // Write atomically using temp file
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(collection, null, 2), 'utf-8');
  await fs.rename(tempPath, filePath);
  
  return collection;
};

/**
 * Update an existing collection
 * Uses atomic write pattern for data safety
 * @param {string} id - Collection ID
 * @param {Object} data - Updated collection data
 * @returns {Promise<Object>} Updated collection
 */
const updateCollection = async (id, data) => {
  const existing = await getCollection(id);
  
  if (!existing) {
    throw new Error(`Collection not found: ${id}`);
  }
  
  const updated = {
    ...existing,
    ...data,
    id: existing.id, // Never allow ID change
    createdAt: existing.createdAt, // Preserve creation date
    updatedAt: Date.now(),
  };
  
  const filePath = getCollectionPath(id);
  
  // Atomic write: write to temp file, then rename
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(updated, null, 2), 'utf-8');
  await fs.rename(tempPath, filePath);
  
  return updated;
};

/**
 * Delete a collection
 * @param {string} id - Collection ID
 * @returns {Promise<void>}
 */
const deleteCollection = async (id) => {
  const filePath = getCollectionPath(id);
  
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    // File already doesn't exist, that's fine
  }
};

module.exports = {
  getAllCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection,
};
