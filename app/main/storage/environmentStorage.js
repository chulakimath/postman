/**
 * Environment Storage (SQLite Backend)
 * 
 * Manages Environment profiles and variables persistence using SQLite.
 * Table: `environments` (id, name, variables, created_at, updated_at)
 */

const { getDb } = require('./db');
const { v4: uuidv4 } = require('uuid');

/**
 * Format raw environment DB row to standard object
 */
const formatEnvironment = (row) => {
  if (!row) return null;
  let variables = [];
  try {
    variables = JSON.parse(row.variables || '[]');
  } catch (e) {
    console.error('Error parsing variables JSON:', e);
  }

  return {
    id: row.id,
    name: row.name,
    variables,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/**
 * Get all environment profiles
 */
const getAllEnvironments = async () => {
  const db = getDb();
  const rows = db.prepare('SELECT id, name, variables, created_at, updated_at FROM environments ORDER BY created_at DESC').all();
  return rows.map(formatEnvironment);
};

/**
 * Get a single environment profile by ID
 */
const getEnvironment = async (id) => {
  const db = getDb();
  const row = db.prepare('SELECT id, name, variables, created_at, updated_at FROM environments WHERE id = ?').get(id);
  return formatEnvironment(row);
};

/**
 * Create a new environment profile
 * @param {Object} data - { name: string, variables?: Array }
 */
const createEnvironment = async (data) => {
  const db = getDb();
  const now = Date.now();
  const id = uuidv4();
  const name = data.name || 'New Environment';
  const variables = JSON.stringify(data.variables || []);

  db.prepare(`
    INSERT INTO environments (id, name, variables, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name, variables, now, now);

  return {
    id,
    name,
    variables: data.variables || [],
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * Update an existing environment profile
 * @param {string} id - Environment ID
 * @param {Object} data - { name?: string, variables?: Array }
 */
const updateEnvironment = async (id, data) => {
  const db = getDb();
  const existing = db.prepare('SELECT id, name, variables, created_at, updated_at FROM environments WHERE id = ?').get(id);

  if (!existing) {
    throw new Error(`Environment not found: ${id}`);
  }

  const now = Date.now();
  const updatedName = data.name !== undefined ? data.name : existing.name;
  const updatedVariables = data.variables !== undefined ? JSON.stringify(data.variables) : existing.variables;

  db.prepare(`
    UPDATE environments
    SET name = ?, variables = ?, updated_at = ?
    WHERE id = ?
  `).run(updatedName, updatedVariables, now, id);

  return getEnvironment(id);
};

/**
 * Delete an environment profile
 * @param {string} id - Environment ID
 */
const deleteEnvironment = async (id) => {
  const db = getDb();
  db.prepare('DELETE FROM environments WHERE id = ?').run(id);
};

module.exports = {
  getAllEnvironments,
  getEnvironment,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
};
