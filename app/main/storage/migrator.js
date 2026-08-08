/**
 * Storage Migrator
 * 
 * Auto-migrates legacy JSON files (collections/*.json and app-state.json)
 * into SQLite database tables on initial launch.
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { getDb } = require('./db');

const getStorageDir = () => {
  const isDev = !app.isPackaged;
  return isDev
    ? path.join(__dirname, '..', '..', '..', 'storage')
    : path.join(app.getPath('userData'), 'storage');
};

const runMigration = () => {
  const db = getDb();
  const storageDir = getStorageDir();
  const collectionsDir = path.join(storageDir, 'collections');
  const appStatePath = path.join(storageDir, 'app-state.json');

  // Check if collections directory exists with JSON files
  if (fs.existsSync(collectionsDir)) {
    const files = fs.readdirSync(collectionsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    if (jsonFiles.length > 0) {
      console.log(`[Migrator] Found ${jsonFiles.length} JSON collection files. Starting migration to SQLite...`);

      const insertCollection = db.prepare(`
        INSERT OR REPLACE INTO collections (id, name, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `);

      const insertRequest = db.prepare(`
        INSERT OR REPLACE INTO requests (id, collection_id, name, method, url, headers, params, body, auth, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const migrateAll = db.transaction(() => {
        for (const file of jsonFiles) {
          const filePath = path.join(collectionsDir, file);
          try {
            const rawContent = fs.readFileSync(filePath, 'utf-8');
            const collection = JSON.parse(rawContent);

            const colId = collection.id || file.replace('.json', '');
            const colName = collection.name || 'Migrated Collection';
            const colCreatedAt = collection.createdAt || Date.now();
            const colUpdatedAt = collection.updatedAt || Date.now();

            insertCollection.run(colId, colName, colCreatedAt, colUpdatedAt);

            if (Array.isArray(collection.requests)) {
              collection.requests.forEach((req, idx) => {
                const reqId = req.id || `${colId}-req-${idx}`;
                const reqName = req.name || 'Untitled Request';
                const reqMethod = req.method || 'GET';
                const reqUrl = req.url || '';
                const reqHeaders = JSON.stringify(req.headers || []);
                const reqParams = JSON.stringify(req.params || []);
                const reqBody = JSON.stringify(req.body || { activeType: 'none', json: '{\n  \n}', formdata: [], raw: '' });
                const reqAuth = JSON.stringify(req.auth || { type: 'none', data: {} });
                const reqOrder = idx;
                const reqCreatedAt = req.createdAt || colCreatedAt;
                const reqUpdatedAt = req.updatedAt || colUpdatedAt;

                insertRequest.run(
                  reqId,
                  colId,
                  reqName,
                  reqMethod,
                  reqUrl,
                  reqHeaders,
                  reqParams,
                  reqBody,
                  reqAuth,
                  reqOrder,
                  reqCreatedAt,
                  reqUpdatedAt
                );
              });
            }

            // Move migrated JSON file to backup folder
            const backupDir = path.join(collectionsDir, 'json_backup');
            if (!fs.existsSync(backupDir)) {
              fs.mkdirSync(backupDir, { recursive: true });
            }
            fs.renameSync(filePath, path.join(backupDir, file));
          } catch (err) {
            console.error(`[Migrator] Error migrating file ${file}:`, err);
          }
        }
      });

      migrateAll();
      console.log('[Migrator] Collections migration completed successfully.');
    }
  }

  // Check app-state.json
  if (fs.existsSync(appStatePath)) {
    try {
      console.log('[Migrator] Migrating app-state.json to SQLite...');
      const rawState = fs.readFileSync(appStatePath, 'utf-8');
      const stateObj = JSON.parse(rawState);

      const insertState = db.prepare(`
        INSERT OR REPLACE INTO app_state (key, value, updated_at)
        VALUES (?, ?, ?)
      `);

      const now = Date.now();
      Object.keys(stateObj).forEach(key => {
        const val = typeof stateObj[key] === 'object' ? JSON.stringify(stateObj[key]) : String(stateObj[key]);
        insertState.run(key, val, now);
      });

      // Backup app-state.json
      fs.renameSync(appStatePath, `${appStatePath}.bak`);
      console.log('[Migrator] app-state.json migration completed.');
    } catch (err) {
      console.error('[Migrator] Error migrating app-state.json:', err);
    }
  }
};

module.exports = {
  runMigration,
};
