const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db;
let dbPath;

function getDbPath() {
  return path.join(app.getPath('userData'), 'taskking.db');
}

async function initDb() {
  dbPath = getDbPath();

  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
      due_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      deleted INTEGER NOT NULL DEFAULT 0,
      deleted_at TEXT,
      sort_order INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS task_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      tag TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Create indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON tasks(sort_order)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_deleted ON tasks(deleted)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)',
    'CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id)',
    'CREATE INDEX IF NOT EXISTS idx_task_tags_tag ON task_tags(tag)',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_task_tags_unique ON task_tags(task_id, tag)'
  ];

  for (const sql of indexes) {
    db.run(sql);
  }

  // Save after initial setup
  saveDb();

  return db;
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

function saveDb() {
  if (!db || !dbPath) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

module.exports = { initDb, getDb, saveDb };
