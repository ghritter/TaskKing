const crypto = require('crypto');
const { getDb, saveDb } = require('./db');

// Helper functions matching the sql.js API
function queryOne(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

function run(sql, params = []) {
  const db = getDb();
  db.run(sql, params);
}

function initAuth() {
  const existing = queryOne('SELECT value FROM app_config WHERE key = ?', ['api_key']);
  if (!existing) {
    const key = crypto.randomBytes(16).toString('hex');
    run('INSERT INTO app_config (key, value) VALUES (?, ?)', ['api_key', key]);
    saveDb();
  }
}

function getApiKey() {
  const row = queryOne('SELECT value FROM app_config WHERE key = ?', ['api_key']);
  return row ? row.value : null;
}

function regenerateApiKey() {
  const newKey = crypto.randomBytes(16).toString('hex');
  run('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)', ['api_key', newKey]);
  saveDb();
  return newKey;
}

function validateApiKey(req, res, next) {
  // Skip auth if no API key is configured yet (first-run race condition)
  const actualKey = getApiKey();
  if (!actualKey) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: API key required' });
  }

  const providedKey = authHeader.slice(7);

  if (providedKey !== actualKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }

  next();
}

module.exports = { initAuth, getApiKey, regenerateApiKey, validateApiKey };
