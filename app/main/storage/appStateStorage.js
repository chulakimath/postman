/**
 * App State Storage (SQLite Backend)
 * 
 * Persists UI state (open tabs, active requests, drafts) in SQLite `app_state` table.
 */

const { getDb } = require('./db');

/**
 * Save application state into SQLite table
 * @param {Object} state - State to persist
 */
const saveState = async (state) => {
  const db = getDb();
  const now = Date.now();

  const upsertStmt = db.prepare(`
    INSERT INTO app_state (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `);

  const saveAll = db.transaction(() => {
    Object.keys(state).forEach(key => {
      const val = typeof state[key] === 'object' ? JSON.stringify(state[key]) : String(state[key]);
      upsertStmt.run(key, val, now);
    });
    upsertStmt.run('_meta_savedAt', String(now), now);
    upsertStmt.run('_meta_version', '1', now);
  });

  saveAll();
};

/**
 * Load previously saved application state from SQLite
 * @returns {Promise<Object|null>} Saved state or null
 */
const loadState = async () => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM app_state').all();

    if (!rows || rows.length === 0) {
      return null;
    }

    const state = {};
    rows.forEach(row => {
      if (row.key.startsWith('_meta_')) return;

      try {
        state[row.key] = JSON.parse(row.value);
      } catch (e) {
        state[row.key] = row.value;
      }
    });

    return state;
  } catch (error) {
    console.error('Error loading app state from SQLite:', error);
    return null;
  }
};

module.exports = {
  saveState,
  loadState,
};
