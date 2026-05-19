# TaskKing — Design Document

## Overview

This document describes the technical architecture, data model, component structure, and implementation approach for TaskKing Phase 1 (MVP).

---

## Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Desktop shell | Electron 33+ | Cross-platform desktop app, no terminal needed |
| Frontend framework | Svelte 5 | Lightweight, fast compilation, minimal runtime |
| CSS | Tailwind CSS 4 | Utility-first, easy theming, small bundle |
| Backend/API | Express.js | Runs in Electron main process, serves REST API |
| Database | better-sqlite3 | Synchronous SQLite bindings for Node.js, fast |
| Markdown | marked | Lightweight Markdown parser |
| Drag-and-drop | sortablejs | Mature, accessible drag-and-drop library |
| Build tool | Vite | Fast dev server and bundler for Svelte |
| Electron build | electron-builder | Packages app for Windows/Mac/Linux |

---

## Project Structure

```
TaskKing/
├── docs/                    # Project documentation
│   ├── requirements.md
│   └── design.md
├── src/
│   ├── main/                # Electron main process
│   │   ├── index.js         # App entry point, creates window
│   │   ├── api.js           # Express server setup + routes
│   │   ├── db.js            # SQLite database initialization + queries
│   │   ├── auth.js          # API key generation, validation, storage
│   │   └── preload.js       # Preload script for renderer security
│   ├── renderer/            # Svelte frontend (runs in browser window)
│   │   ├── App.svelte       # Root component
│   │   ├── main.js          # Svelte app entry point
│   │   ├── index.html       # HTML shell
│   │   ├── app.css          # Tailwind imports + custom theme
│   │   ├── lib/
│   │   │   ├── api.js       # HTTP client for talking to Express API
│   │   │   ├── stores.js    # Svelte stores (tasks, filters, sort, view mode)
│   │   │   └── utils.js     # Date formatting, markdown rendering, URL linking
│   │   └── components/
│   │       ├── Header.svelte
│   │       ├── Toolbar.svelte
│   │       ├── TaskList.svelte
│   │       ├── TaskItem.svelte
│   │       ├── TaskDetail.svelte    # Edit/create panel (slide-over)
│   │       ├── KingView.svelte
│   │       ├── Toast.svelte
│   │       └── Toggle.svelte
├── package.json
├── vite.config.js
├── tailwind.config.js
├── electron-builder.yml      # Packaging configuration
└── mockup.html               # Visual reference (not part of build)
```

---

## Database Schema

### Tables

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,          -- UUID v4
  name TEXT NOT NULL,           -- Max 255 chars, enforced in app
  description TEXT DEFAULT '',  -- Markdown content
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  due_date TEXT,                -- ISO 8601 date string (YYYY-MM-DD) or NULL
  created_at TEXT NOT NULL,     -- ISO 8601 timestamp
  updated_at TEXT NOT NULL,     -- ISO 8601 timestamp
  completed INTEGER NOT NULL DEFAULT 0,  -- 0 = false, 1 = true
  completed_at TEXT,            -- ISO 8601 timestamp or NULL
  deleted INTEGER NOT NULL DEFAULT 0,    -- 0 = false, 1 = true
  deleted_at TEXT,              -- ISO 8601 timestamp or NULL
  sort_order INTEGER NOT NULL   -- Lower = higher in list
);

CREATE TABLE task_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag TEXT NOT NULL             -- Lowercase, no spaces
);

CREATE TABLE app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- Stores: api_key, sort_preference, show_completed, show_due_dates, theme
```

### Indexes

```sql
CREATE INDEX idx_tasks_sort_order ON tasks(sort_order);
CREATE INDEX idx_tasks_deleted ON tasks(deleted);
CREATE INDEX idx_tasks_completed ON tasks(completed);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX idx_task_tags_tag ON task_tags(tag);
CREATE UNIQUE INDEX idx_task_tags_unique ON task_tags(task_id, tag);
```

### Database Location

- **Windows:** `%APPDATA%/TaskKing/taskking.db`
- **Mac:** `~/Library/Application Support/TaskKing/taskking.db`
- **Linux:** `~/.config/TaskKing/taskking.db`

Electron's `app.getPath('userData')` provides the correct path per platform.

### WAL Mode

SQLite is configured with WAL (Write-Ahead Logging) mode for crash safety:

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
```

---

## API Design

### Base URL

- Local: `http://localhost:7878`
- Port 7878 chosen to avoid conflicts with common dev servers (3000, 5173, 8080)

### Authentication

All requests (except from the Electron renderer itself) must include:

```
Authorization: Bearer <api_key>
```

- API key is a 32-character random hex string generated on first launch
- Stored in `app_config` table (key: `api_key`)
- Viewable and regenerable from the app's settings UI
- The Electron renderer communicates with the API via localhost; it includes the key automatically (loaded from main process via IPC on startup)

### Endpoints

#### GET /api/tasks

Query parameters:
- `sort` — `custom` | `priority` | `created` | `edited` | `due` | `alpha` (default: `custom`)
- `search` — keyword string (matches name and description)
- `tag` — filter by tag (can repeat: `?tag=research&tag=nsf`)
- `show_completed` — `true` | `false` (default: `true`)
- `show_deleted` — `true` | `false` (default: `false`)

Response:
```json
{
  "tasks": [
    {
      "id": "uuid",
      "name": "Task name",
      "description": "Markdown text",
      "priority": 1,
      "due_date": "2026-05-15",
      "created_at": "2026-05-11T10:00:00Z",
      "updated_at": "2026-05-11T10:00:00Z",
      "completed": false,
      "completed_at": null,
      "sort_order": 1,
      "tags": ["research", "nsf"]
    }
  ],
  "count": 1
}
```

#### GET /api/tasks/:id

Response: Single task object (same shape as above). 404 if not found or deleted.

#### POST /api/tasks

Request body:
```json
{
  "name": "Task name",
  "description": "",
  "priority": 3,
  "due_date": "2026-05-15",
  "tags": ["tag1", "tag2"]
}
```

Behavior:
- Generates UUID for `id`
- Sets `created_at` and `updated_at` to current timestamp
- Sets `sort_order` to 0 (top of list), shifts all other tasks down by 1
- Normalizes tags to lowercase, strips spaces
- Returns created task object with 201 status

#### PUT /api/tasks/:id

Request body: Any subset of task fields (partial update).
```json
{
  "name": "Updated name",
  "priority": 1,
  "tags": ["new-tag"]
}
```

Behavior:
- Updates `updated_at` to current timestamp
- If `tags` is provided, replaces all existing tags (delete + re-insert)
- Returns updated task object

#### DELETE /api/tasks/:id

Behavior:
- Sets `deleted = 1` and `deleted_at` to current timestamp
- Sets `updated_at` to current timestamp
- Returns `{ "success": true, "undo_until": "<timestamp 5s from now>" }`

#### POST /api/tasks/:id/undo-delete

Behavior:
- Sets `deleted = 0` and `deleted_at = NULL`
- Only works within 5 seconds of deletion (checks `deleted_at`)
- Returns restored task object or 410 Gone if undo window expired

#### PATCH /api/tasks/:id/complete

Behavior:
- Toggles `completed` (0 → 1 or 1 → 0)
- If completing: sets `completed_at` to current timestamp
- If uncompleting: sets `completed_at = NULL`
- Updates `updated_at`
- Returns updated task object

#### PATCH /api/tasks/:id/pop-to-top

Behavior:
- Sets this task's `sort_order` to 0
- Increments all other non-deleted tasks' `sort_order` by 1
- Updates `updated_at`
- Returns updated task object

#### PATCH /api/tasks/reorder

Request body:
```json
{
  "order": ["uuid-1", "uuid-2", "uuid-3"]
}
```

Behavior:
- Sets `sort_order` for each task ID based on array index
- Does NOT update `updated_at` (reordering is not an "edit")
- Returns `{ "success": true }`

#### GET /api/settings

Response:
```json
{
  "sort_preference": "custom",
  "show_completed": true,
  "show_due_dates": true,
  "theme": "light"
}
```

#### PUT /api/settings

Request body: Any subset of settings. Persists to `app_config` table.

#### GET /api/key

Response: `{ "api_key": "<current key>" }`
(Only accessible from Electron renderer via IPC, not exposed on HTTP)

#### POST /api/key/regenerate

Behavior: Generates new API key, stores it, returns new key.
(Only accessible from Electron renderer via IPC, not exposed on HTTP)

---

## Electron Architecture

### Main Process (`src/main/index.js`)

Responsibilities:
1. Create the BrowserWindow (loads Svelte app)
2. Start Express server on port 7878
3. Initialize SQLite database (create tables if first run)
4. Generate API key on first run
5. Handle IPC calls from renderer (get API key, get settings)
6. Handle app lifecycle (quit, minimize to tray, etc.)

### Preload Script (`src/main/preload.js`)

Exposes a limited API to the renderer via `contextBridge`:
```javascript
contextBridge.exposeInMainWorld('taskking', {
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  getPort: () => ipcRenderer.invoke('get-port'),
  getPlatform: () => process.platform
});
```

### Renderer Process (`src/renderer/`)

The Svelte app runs here. It communicates with the Express API via HTTP (localhost:7878). The API key is fetched once on startup via IPC and included in all subsequent HTTP requests.

### Security

- `nodeIntegration: false` (renderer cannot access Node.js)
- `contextIsolation: true` (preload script is sandboxed)
- `webSecurity: true`
- Content Security Policy restricts external resource loading

---

## Frontend Architecture

### State Management (Svelte Stores)

```javascript
// stores.js
export const tasks = writable([]);           // All tasks from API
export const sortMode = writable('custom');   // Current sort mode
export const searchQuery = writable('');      // Search input value
export const activeTagFilters = writable([]); // Active tag filters
export const showCompleted = writable(true);  // Toggle state
export const showDueDates = writable(true);   // Toggle state
export const isKingView = writable(false);    // King Task mode
export const editingTask = writable(null);    // Task being edited (opens panel)
export const toastMessage = writable(null);   // Toast notification state
```

### Component Responsibilities

| Component | Role |
|-----------|------|
| `App.svelte` | Layout shell, initializes stores from API |
| `Header.svelte` | Logo, task count, "New Task" button |
| `Toolbar.svelte` | Search box, sort dropdown, active filter chips |
| `Toggle.svelte` | Reusable toggle switch (show completed, show due dates, king mode) |
| `TaskList.svelte` | Renders list of TaskItems, handles drag-and-drop via sortablejs |
| `TaskItem.svelte` | Single task row: checkbox, priority, name, due date, tags, actions |
| `TaskDetail.svelte` | Slide-over panel for creating/editing a task |
| `KingView.svelte` | Focus view showing the #1 task with full details |
| `Toast.svelte` | Fixed-position toast with undo button, auto-dismisses after 5s |

### Drag-and-Drop

- `sortablejs` attached to the TaskList container
- On drag end: collect new order of task IDs, call `PATCH /api/tasks/reorder`
- Only active when sort mode is "Custom Order"
- Drag handles visible only in custom sort mode

### Markdown Rendering

- `marked` library parses Markdown to HTML
- Custom renderer extension: detect bare URLs (http:// or https://) and wrap in `<a>` tags
- Output is sanitized (no script injection) via `marked`'s built-in sanitization
- Rendered in `KingView` and `TaskDetail` (view mode)

### Theming

Tailwind CSS with custom theme in `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      purple: { DEFAULT: '#6b21a8', light: '#9333ea' },
      gold: { DEFAULT: '#b8860b', light: '#d4a017' },
    }
  }
}
```

CSS variables for the full palette (matching the mockup) defined in `app.css`.

---

## Sort Order Implementation

### Custom Sort

- Each task has a `sort_order` integer
- New tasks get `sort_order = 0`; all existing tasks shift +1
- "Pop to top" sets task to 0, shifts others +1
- Drag-and-drop sends the full ordered ID list; backend assigns sequential sort_order values
- Gaps are acceptable (no need to compact)

### Other Sort Modes

Handled purely in the API query:
- **Priority:** `ORDER BY priority ASC, sort_order ASC`
- **Created:** `ORDER BY created_at DESC`
- **Edited:** `ORDER BY updated_at DESC`
- **Due date:** `ORDER BY due_date ASC NULLS LAST`
- **Alphabetical:** `ORDER BY name COLLATE NOCASE ASC`

When not in custom sort mode, drag handles are hidden and reordering is disabled.

---

## API Key Management

### Generation
- On first launch, generate a 32-character hex string via `crypto.randomBytes(16).toString('hex')`
- Store in `app_config` table with key `api_key`

### Access
- Renderer gets the key via IPC (`window.taskking.getApiKey()`)
- External callers (Kiro, scripts) must know the key — user can view it in Settings

### Regeneration
- User clicks "Regenerate" in Settings
- New key generated, old key immediately invalidated
- All external callers need the new key

### Validation
- Express middleware checks `Authorization: Bearer <key>` header
- Requests from the Electron renderer include the key automatically
- Invalid/missing key returns `401 Unauthorized`

---

## Build and Packaging

### Development
```bash
npm run dev        # Starts Vite dev server + Electron in dev mode
```

### Production Build
```bash
npm run build      # Builds Svelte app via Vite, then packages with electron-builder
```

### Output
- **Windows:** `.exe` installer (NSIS) + portable `.exe`
- **Mac:** `.dmg`
- **Linux:** `.AppImage`

### electron-builder.yml
```yaml
appId: com.taskking.app
productName: TaskKing
directories:
  output: dist
files:
  - src/main/**/*
  - build/**/*
win:
  target: [nsis, portable]
mac:
  target: [dmg]
linux:
  target: [AppImage]
```

---

## Data Flow Summary

```
User Action -> Svelte Component -> HTTP Request -> Express API -> SQLite -> Response -> Store Update -> UI Re-render
```

For Kiro/external integration:
```
External Script -> HTTP Request (with API key) -> Express API -> SQLite -> Response
```

---

## Future Considerations (Phase 2/3, not built now)

- **Dark mode:** Toggle CSS variables via a `data-theme` attribute on `<html>`
- **Keyboard shortcuts:** Global event listener in `App.svelte`
- **Export/Import:** `GET /api/export` returns full JSON dump; `POST /api/import` accepts it
- **Cloud deployment:** Remove Electron wrapper, deploy Express + Vite build to container
- **30-day cleanup:** Scheduled function in main process (runs on app start, checks `deleted_at`)
