const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb, saveDb } = require('./db');
const { validateApiKey } = require('./auth');

// Helper: run a SELECT and return array of row objects
function queryAll(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Helper: run a SELECT and return first row object or null
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

// Helper: run an INSERT/UPDATE/DELETE
function run(sql, params = []) {
  const db = getDb();
  db.run(sql, params);
}

function startApi(port) {
  const app = express();
  app.use(express.json());

  // CORS - allow requests from Vite dev server and Electron
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Auth middleware for all API routes
  app.use('/api', validateApiKey);

  // --- TASKS ---

  // GET /api/tasks
  app.get('/api/tasks', (req, res) => {
    const { sort = 'custom', search, tag, show_completed = 'true', show_deleted = 'false' } = req.query;

    let where = [];
    let params = [];

    if (show_deleted !== 'true') {
      where.push('t.deleted = 0');
    }

    if (show_completed !== 'true') {
      where.push('t.completed = 0');
    }

    // Search
    if (search) {
      where.push("(t.name LIKE ? OR t.description LIKE ? OR t.id IN (SELECT task_id FROM task_tags WHERE tag LIKE ?))");
      params.push(`%${search}%`, `%${search}%`, `%${search.toLowerCase()}%`);
    }

    const tags = Array.isArray(tag) ? tag : (tag ? [tag] : []);
    if (tags.length > 0) {
      const placeholders = tags.map(() => '?').join(',');
      where.push(`t.id IN (SELECT task_id FROM task_tags WHERE tag IN (${placeholders}))`);
      params.push(...tags.map(t => t.toLowerCase()));
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    let orderBy;
    switch (sort) {
      case 'priority': orderBy = 'ORDER BY t.priority ASC, t.sort_order ASC'; break;
      case 'created': orderBy = 'ORDER BY t.created_at DESC'; break;
      case 'edited': orderBy = 'ORDER BY t.updated_at DESC'; break;
      case 'due': orderBy = 'ORDER BY CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END, t.due_date ASC'; break;
      case 'alpha': orderBy = 'ORDER BY t.name COLLATE NOCASE ASC'; break;
      default: orderBy = 'ORDER BY t.sort_order ASC'; break;
    }

    const sql = `SELECT t.* FROM tasks t ${whereClause} ${orderBy}`;
    const tasks = queryAll(sql, params);

    const result = tasks.map(task => ({
      ...task,
      completed: !!task.completed,
      deleted: !!task.deleted,
      tags: queryAll('SELECT tag FROM task_tags WHERE task_id = ?', [task.id]).map(r => r.tag)
    }));

    res.json({ tasks: result, count: result.length });
  });

  // GET /api/tasks/:id
  app.get('/api/tasks/:id', (req, res) => {
    const task = queryOne('SELECT * FROM tasks WHERE id = ? AND deleted = 0', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const tags = queryAll('SELECT tag FROM task_tags WHERE task_id = ?', [task.id]).map(r => r.tag);
    res.json({ ...task, completed: !!task.completed, deleted: !!task.deleted, tags });
  });

  // POST /api/tasks
  app.post('/api/tasks', (req, res) => {
    const { name, description = '', priority = 3, due_date = null, tags = [] } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Task name is required' });
    }

    if (priority < 1 || priority > 5) {
      return res.status(400).json({ error: 'Priority must be between 1 and 5' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    // Shift all existing tasks down
    run('UPDATE tasks SET sort_order = sort_order + 1 WHERE deleted = 0');

    // Insert new task at top
    run(
      'INSERT INTO tasks (id, name, description, priority, due_date, created_at, updated_at, completed, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)',
      [id, name.trim(), description, priority, due_date, now, now]
    );

    // Insert tags
    for (const t of tags) {
      const normalized = t.toLowerCase().replace(/\s+/g, '');
      if (normalized) {
        run('INSERT OR IGNORE INTO task_tags (task_id, tag) VALUES (?, ?)', [id, normalized]);
      }
    }

    saveDb();

    const task = queryOne('SELECT * FROM tasks WHERE id = ?', [id]);
    const taskTags = queryAll('SELECT tag FROM task_tags WHERE task_id = ?', [id]).map(r => r.tag);

    res.status(201).json({ ...task, completed: !!task.completed, deleted: !!task.deleted, tags: taskTags });
  });

  // POST /api/tasks/import (bulk import with preserved timestamps, appends to bottom)
  app.post('/api/tasks/import', (req, res) => {
    const { tasks: importTasks } = req.body;

    if (!Array.isArray(importTasks)) {
      return res.status(400).json({ error: 'Body must contain a "tasks" array' });
    }

    // Get current max sort_order
    const maxRow = queryOne('SELECT MAX(sort_order) as max_sort FROM tasks WHERE deleted = 0');
    let nextSort = (maxRow && maxRow.max_sort !== null) ? maxRow.max_sort + 1 : 0;

    const now = new Date().toISOString();
    let imported = 0;

    for (const t of importTasks) {
      if (!t.name || !t.name.trim()) continue;

      const id = uuidv4();
      const created = t.created_at || now;
      const updated = t.updated_at || now;
      const priority = (t.priority >= 1 && t.priority <= 5) ? t.priority : 3;
      const completed = t.completed ? 1 : 0;
      const completedAt = t.completed_at || null;

      run(
        'INSERT INTO tasks (id, name, description, priority, due_date, created_at, updated_at, completed, completed_at, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, t.name.trim(), t.description || '', priority, t.due_date || null, created, updated, completed, completedAt, nextSort]
      );

      // Insert tags
      const tags = t.tags || [];
      for (const tag of tags) {
        const normalized = tag.toLowerCase().replace(/\s+/g, '');
        if (normalized) {
          run('INSERT OR IGNORE INTO task_tags (task_id, tag) VALUES (?, ?)', [id, normalized]);
        }
      }

      nextSort++;
      imported++;
    }

    saveDb();
    res.status(201).json({ success: true, imported });
  });

  // PUT /api/tasks/:id
  app.put('/api/tasks/:id', (req, res) => {
    const task = queryOne('SELECT * FROM tasks WHERE id = ? AND deleted = 0', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const { name, description, priority, due_date, tags } = req.body;
    const now = new Date().toISOString();

    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (priority !== undefined) {
      if (priority < 1 || priority > 5) return res.status(400).json({ error: 'Priority must be between 1 and 5' });
      updates.push('priority = ?'); params.push(priority);
    }
    if (due_date !== undefined) { updates.push('due_date = ?'); params.push(due_date); }

    updates.push('updated_at = ?');
    params.push(now);
    params.push(req.params.id);

    if (updates.length > 1) {
      run(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Replace tags if provided
    if (tags !== undefined) {
      run('DELETE FROM task_tags WHERE task_id = ?', [req.params.id]);
      for (const t of tags) {
        const normalized = t.toLowerCase().replace(/\s+/g, '');
        if (normalized) {
          run('INSERT OR IGNORE INTO task_tags (task_id, tag) VALUES (?, ?)', [req.params.id, normalized]);
        }
      }
    }

    saveDb();

    const updated = queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    const taskTags = queryAll('SELECT tag FROM task_tags WHERE task_id = ?', [req.params.id]).map(r => r.tag);

    res.json({ ...updated, completed: !!updated.completed, deleted: !!updated.deleted, tags: taskTags });
  });

  // DELETE /api/tasks/:id (soft delete)
  app.delete('/api/tasks/:id', (req, res) => {
    const task = queryOne('SELECT * FROM tasks WHERE id = ? AND deleted = 0', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const now = new Date().toISOString();
    run('UPDATE tasks SET deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, req.params.id]);
    saveDb();

    const undoUntil = new Date(Date.now() + 5000).toISOString();
    res.json({ success: true, undo_until: undoUntil });
  });

  // POST /api/tasks/:id/undo-delete
  app.post('/api/tasks/:id/undo-delete', (req, res) => {
    const task = queryOne('SELECT * FROM tasks WHERE id = ? AND deleted = 1', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Task not found or not deleted' });

    const deletedAt = new Date(task.deleted_at).getTime();
    const now = Date.now();
    if (now - deletedAt > 5000) {
      return res.status(410).json({ error: 'Undo window expired' });
    }

    run('UPDATE tasks SET deleted = 0, deleted_at = NULL WHERE id = ?', [req.params.id]);
    saveDb();

    const restored = queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    const tags = queryAll('SELECT tag FROM task_tags WHERE task_id = ?', [req.params.id]).map(r => r.tag);

    res.json({ ...restored, completed: !!restored.completed, deleted: !!restored.deleted, tags });
  });

  // POST /api/tasks/:id/restore (no time limit — for Settings panel)
  app.post('/api/tasks/:id/restore', (req, res) => {
    const task = queryOne('SELECT * FROM tasks WHERE id = ? AND deleted = 1', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Task not found or not deleted' });

    run('UPDATE tasks SET deleted = 0, deleted_at = NULL WHERE id = ?', [req.params.id]);
    saveDb();

    const restored = queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    const tags = queryAll('SELECT tag FROM task_tags WHERE task_id = ?', [req.params.id]).map(r => r.tag);

    res.json({ ...restored, completed: !!restored.completed, deleted: !!restored.deleted, tags });
  });

  // PATCH /api/tasks/:id/complete
  app.patch('/api/tasks/:id/complete', (req, res) => {
    const task = queryOne('SELECT * FROM tasks WHERE id = ? AND deleted = 0', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const now = new Date().toISOString();
    const newCompleted = task.completed ? 0 : 1;
    const completedAt = newCompleted ? now : null;

    run('UPDATE tasks SET completed = ?, completed_at = ?, updated_at = ? WHERE id = ?',
      [newCompleted, completedAt, now, req.params.id]);
    saveDb();

    const updated = queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    const tags = queryAll('SELECT tag FROM task_tags WHERE task_id = ?', [req.params.id]).map(r => r.tag);

    res.json({ ...updated, completed: !!updated.completed, deleted: !!updated.deleted, tags });
  });

  // PATCH /api/tasks/:id/pop-to-top
  app.patch('/api/tasks/:id/pop-to-top', (req, res) => {
    const task = queryOne('SELECT * FROM tasks WHERE id = ? AND deleted = 0', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const now = new Date().toISOString();

    run('UPDATE tasks SET sort_order = sort_order + 1 WHERE deleted = 0');
    run('UPDATE tasks SET sort_order = 0, updated_at = ? WHERE id = ?', [now, req.params.id]);
    saveDb();

    const updated = queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    const tags = queryAll('SELECT tag FROM task_tags WHERE task_id = ?', [req.params.id]).map(r => r.tag);

    res.json({ ...updated, completed: !!updated.completed, deleted: !!updated.deleted, tags });
  });

  // PATCH /api/tasks/reorder
  app.patch('/api/tasks/reorder', (req, res) => {
    const { order } = req.body;

    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'order must be an array of task IDs' });
    }

    for (let i = 0; i < order.length; i++) {
      run('UPDATE tasks SET sort_order = ? WHERE id = ?', [i, order[i]]);
    }
    saveDb();

    res.json({ success: true });
  });

  // --- SETTINGS ---

  // GET /api/settings
  app.get('/api/settings', (req, res) => {
    const rows = queryAll("SELECT key, value FROM app_config WHERE key IN ('sort_preference', 'show_completed', 'show_due_dates', 'theme')");

    const settings = {
      sort_preference: 'custom',
      show_completed: true,
      show_due_dates: true,
      theme: 'light'
    };

    for (const row of rows) {
      if (row.value === 'true') settings[row.key] = true;
      else if (row.value === 'false') settings[row.key] = false;
      else settings[row.key] = row.value;
    }

    res.json(settings);
  });

  // PUT /api/settings
  app.put('/api/settings', (req, res) => {
    const allowed = ['sort_preference', 'show_completed', 'show_due_dates', 'theme'];

    for (const [key, value] of Object.entries(req.body)) {
      if (allowed.includes(key)) {
        run('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)', [key, String(value)]);
      }
    }
    saveDb();

    res.json({ success: true });
  });

  // Start server
  app.listen(port, '127.0.0.1', () => {
    console.log(`TaskKing API running on http://127.0.0.1:${port}`);
  });

  return app;
}

module.exports = { startApi };
