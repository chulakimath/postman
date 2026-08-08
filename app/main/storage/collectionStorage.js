/**
 * Collection Storage (SQLite Backend)
 * 
 * Manages collections and requests persistence using SQLite database.
 * Replaces loose JSON files with indexed SQL queries for fast performance and scaling.
 */

const { getDb } = require('./db');
const { v4: uuidv4 } = require('uuid');

/**
 * Format raw SQLite database rows into standard collection object
 */
const formatCollection = (colRow, requestRows = []) => {
  if (!colRow) return null;

  const formattedRequests = requestRows.map(req => {
    let headers = [];
    let params = [];
    let body = { activeType: 'none', json: '{\n  \n}', formdata: [], raw: '' };
    let auth = { type: 'none', data: {} };

    try { headers = JSON.parse(req.headers || '[]'); } catch (e) { console.error('Parse error headers:', e); }
    try { params = JSON.parse(req.params || '[]'); } catch (e) { console.error('Parse error params:', e); }
    try { body = JSON.parse(req.body || '{}'); } catch (e) { console.error('Parse error body:', e); }
    try { auth = JSON.parse(req.auth || '{}'); } catch (e) { console.error('Parse error auth:', e); }

    return {
      id: req.id,
      name: req.name,
      method: req.method,
      url: req.url,
      headers,
      params,
      body,
      auth,
      createdAt: req.created_at,
      updatedAt: req.updated_at,
    };
  });

  return {
    id: colRow.id,
    name: colRow.name,
    createdAt: colRow.created_at,
    updatedAt: colRow.updated_at,
    requests: formattedRequests,
  };
};

/**
 * Get all collections with their nested requests
 * @returns {Promise<Array>} Array of collection objects
 */
const getAllCollections = async () => {
  const db = getDb();
  
  const colRows = db.prepare(`
    SELECT id, name, created_at, updated_at 
    FROM collections 
    ORDER BY created_at DESC
  `).all();

  const reqRows = db.prepare(`
    SELECT id, collection_id, name, method, url, headers, params, body, auth, sort_order, created_at, updated_at
    FROM requests
    ORDER BY sort_order ASC, created_at ASC
  `).all();

  // Group requests by collection_id
  const reqsByCol = {};
  reqRows.forEach(req => {
    if (!reqsByCol[req.collection_id]) {
      reqsByCol[req.collection_id] = [];
    }
    reqsByCol[req.collection_id].push(req);
  });

  return colRows.map(col => formatCollection(col, reqsByCol[col.id] || []));
};

/**
 * Get a single collection by ID
 * @param {string} id - Collection ID
 * @returns {Promise<Object|null>} Collection or null if not found
 */
const getCollection = async (id) => {
  const db = getDb();

  const colRow = db.prepare(`
    SELECT id, name, created_at, updated_at 
    FROM collections 
    WHERE id = ?
  `).get(id);

  if (!colRow) return null;

  const reqRows = db.prepare(`
    SELECT id, collection_id, name, method, url, headers, params, body, auth, sort_order, created_at, updated_at
    FROM requests
    WHERE collection_id = ?
    ORDER BY sort_order ASC, created_at ASC
  `).all(id);

  return formatCollection(colRow, reqRows);
};

/**
 * Create a new collection
 * @param {Object} data - { name: string }
 * @returns {Promise<Object>} Created collection
 */
const createCollection = async (data) => {
  const db = getDb();
  const now = Date.now();
  const id = uuidv4();
  const name = data.name || 'New Collection';

  db.prepare(`
    INSERT INTO collections (id, name, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `).run(id, name, now, now);

  return {
    id,
    name,
    createdAt: now,
    updatedAt: now,
    requests: [],
  };
};

/**
 * Update an existing collection and sync its requests inside a transaction
 * @param {string} id - Collection ID
 * @param {Object} data - Updated collection data
 * @returns {Promise<Object>} Updated collection
 */
const updateCollection = async (id, data) => {
  const db = getDb();

  const existingCol = db.prepare('SELECT id, name, created_at, updated_at FROM collections WHERE id = ?').get(id);
  if (!existingCol) {
    throw new Error(`Collection not found: ${id}`);
  }

  const now = Date.now();
  const updatedName = data.name !== undefined ? data.name : existingCol.name;

  const executeUpdate = db.transaction(() => {
    // 1. Update collection table
    db.prepare(`
      UPDATE collections
      SET name = ?, updated_at = ?
      WHERE id = ?
    `).run(updatedName, now, id);

    // 2. If requests array is provided, sync requests
    if (Array.isArray(data.requests)) {
      const incomingIds = new Set(data.requests.map(r => r.id));

      // Get existing request IDs in DB for this collection
      const currentReqRows = db.prepare('SELECT id FROM requests WHERE collection_id = ?').all(id);
      const currentIds = currentReqRows.map(r => r.id);

      // Delete requests no longer in incoming array
      const deleteReqStmt = db.prepare('DELETE FROM requests WHERE id = ?');
      for (const currentId of currentIds) {
        if (!incomingIds.has(currentId)) {
          deleteReqStmt.run(currentId);
        }
      }

      // Upsert incoming requests
      const upsertReqStmt = db.prepare(`
        INSERT INTO requests (
          id, collection_id, name, method, url, headers, params, body, auth, sort_order, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          collection_id = excluded.collection_id,
          name = excluded.name,
          method = excluded.method,
          url = excluded.url,
          headers = excluded.headers,
          params = excluded.params,
          body = excluded.body,
          auth = excluded.auth,
          sort_order = excluded.sort_order,
          updated_at = excluded.updated_at
      `);

      data.requests.forEach((req, idx) => {
        const reqId = req.id || uuidv4();
        const reqName = req.name || 'Untitled Request';
        const reqMethod = req.method || 'GET';
        const reqUrl = req.url || '';
        const reqHeaders = JSON.stringify(req.headers || []);
        const reqParams = JSON.stringify(req.params || []);
        const reqBody = JSON.stringify(req.body || { activeType: 'none', json: '{\n  \n}', formdata: [], raw: '' });
        const reqAuth = JSON.stringify(req.auth || { type: 'none', data: {} });
        const reqCreatedAt = req.createdAt || now;
        const reqUpdatedAt = req.updatedAt || now;

        upsertReqStmt.run(
          reqId,
          id,
          reqName,
          reqMethod,
          reqUrl,
          reqHeaders,
          reqParams,
          reqBody,
          reqAuth,
          idx,
          reqCreatedAt,
          reqUpdatedAt
        );
      });
    }
  });

  executeUpdate();

  return getCollection(id);
};

/**
 * Delete a collection
 * @param {string} id - Collection ID
 * @returns {Promise<void>}
 */
const deleteCollection = async (id) => {
  const db = getDb();
  db.prepare('DELETE FROM collections WHERE id = ?').run(id);
};

module.exports = {
  getAllCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection,
};
