/**
 * SQLite Database Storage Layer (WebAssembly Powered by sql.js)
 * 
 * Provides embedded SQLite database for Testly Desktop without requiring
 * native C++ build tools or Visual Studio compilers.
 * 
 * Storage file: [userData]/storage/testly.sqlite
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const initSqlJs = require('sql.js');

let dbInstance = null;
let initPromise = null;

/**
 * Get path to testly.sqlite database file
 */
const getDbPath = () => {
  const isDev = !app.isPackaged;
  const baseDir = isDev
    ? path.join(__dirname, '..', '..', '..', 'storage')
    : path.join(app.getPath('userData'), 'storage');

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  return path.join(baseDir, 'testly.sqlite');
};

let inTransaction = false;
let saveTimeout = null;

/**
 * Persist in-memory WASM SQLite state to disk atomically (Immediate)
 */
const saveDbToDiskImmediate = () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  if (!dbInstance || inTransaction) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    const dbPath = getDbPath();
    const tempPath = `${dbPath}.tmp`;
    fs.writeFileSync(tempPath, buffer);
    fs.renameSync(tempPath, dbPath);
  } catch (error) {
    console.error('[SQLite] Error saving database to disk:', error);
  }
};

/**
 * Persist in-memory WASM SQLite state to disk atomically (Debounced)
 * Coalesces rapid sequential queries into a single disk write
 */
const saveDbToDisk = () => {
  if (!dbInstance || inTransaction) return;
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveDbToDiskImmediate();
  }, 100);
};

/**
 * Initialize SQLite database WASM instance and schemas
 */
const initDb = async () => {
  if (dbInstance) return dbWrapper;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const SQL = await initSqlJs();
    const dbPath = getDbPath();

    if (fs.existsSync(dbPath)) {
      try {
        const fileBuffer = fs.readFileSync(dbPath);
        dbInstance = new SQL.Database(fileBuffer);
      } catch (err) {
        console.error('[SQLite] Error loading database file, creating fresh DB:', err);
        dbInstance = new SQL.Database();
      }
    } else {
      dbInstance = new SQL.Database();
    }

    // Initialize Schema
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS requests (
        id TEXT PRIMARY KEY,
        collection_id TEXT NOT NULL,
        name TEXT NOT NULL,
        method TEXT NOT NULL DEFAULT 'GET',
        url TEXT NOT NULL DEFAULT '',
        headers TEXT NOT NULL DEFAULT '[]',
        params TEXT NOT NULL DEFAULT '[]',
        body TEXT NOT NULL DEFAULT '{}',
        auth TEXT NOT NULL DEFAULT '{}',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS environments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        variables TEXT NOT NULL DEFAULT '[]',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_requests_collection_id ON requests(collection_id);
    `);

    saveDbToDisk();
    return dbWrapper;
  })();

  return initPromise;
};

/**
 * Wrapper object exposing sync-like statement methods
 */
const dbWrapper = {
  prepare: (sql) => ({
    run: (...params) => {
      const flattenedParams = Array.isArray(params[0]) ? params[0] : params;
      dbInstance.run(sql, flattenedParams);
      if (!inTransaction) {
        saveDbToDisk();
      }
    },
    get: (...params) => {
      const flattenedParams = Array.isArray(params[0]) ? params[0] : params;
      const stmt = dbInstance.prepare(sql);
      stmt.bind(flattenedParams);
      let result = null;
      if (stmt.step()) {
        result = stmt.getAsObject();
      }
      stmt.free();
      return result;
    },
    all: (...params) => {
      const flattenedParams = Array.isArray(params[0]) ? params[0] : params;
      const stmt = dbInstance.prepare(sql);
      stmt.bind(flattenedParams);
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    },
  }),
  exec: (sql) => {
    dbInstance.exec(sql);
    if (!inTransaction) {
      saveDbToDisk();
    }
  },
  transaction: (fn) => {
    return (...args) => {
      dbInstance.exec('BEGIN TRANSACTION;');
      inTransaction = true;
      try {
        const result = fn(...args);
        dbInstance.exec('COMMIT;');
        inTransaction = false;
        saveDbToDiskImmediate();
        return result;
      } catch (error) {
        inTransaction = false;
        try {
          dbInstance.exec('ROLLBACK;');
        } catch (e) {
          // Transaction might already be closed
        }
        throw error;
      }
    };
  },
  save: saveDbToDisk,
  saveImmediate: saveDbToDiskImmediate,
};

const getDb = () => dbWrapper;

module.exports = {
  initDb,
  getDb,
  getDbPath,
};
