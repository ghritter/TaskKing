# TaskKing — Implementation Tasks (Phase 1)

## Overview

Ordered task list for building the MVP. Each task is independently verifiable. Tasks are grouped into logical stages but should be executed sequentially.

---

## Stage 1: Project Scaffolding

### Task 1.1 — Initialize project
- Create `package.json` with project metadata and scripts
- Install core dependencies: `electron`, `svelte`, `vite`, `@sveltejs/vite-plugin-svelte`, `express`, `better-sqlite3`, `marked`, `sortablejs`, `uuid`
- Install dev dependencies: `tailwindcss`, `electron-builder`, `concurrently`
- Create `vite.config.js` for Svelte + renderer build
- Create `tailwind.config.js` with purple/gold theme colors
- **Verify:** `npm install` completes without errors

### Task 1.2 — Electron main process shell
- Create `src/main/index.js` — app entry point that creates a BrowserWindow
- Create `src/main/preload.js` — exposes IPC bridge (`getApiKey`, `getPort`, `getPlatform`)
- Configure BrowserWindow: `nodeIntegration: false`, `contextIsolation: true`
- In dev mode, load from Vite dev server URL; in prod, load from built files
- **Verify:** `npm run dev` opens an Electron window (blank page is fine)

### Task 1.3 — Svelte renderer shell
- Create `src/renderer/index.html` — HTML shell with Tailwind CSS
- Create `src/renderer/main.js` — mounts Svelte app
- Create `src/renderer/App.svelte` — renders "TaskKing" placeholder text
- Create `src/renderer/app.css` — Tailwind directives + CSS custom properties (theme palette from mockup)
- **Verify:** Electron window shows styled "TaskKing" text

---

## Stage 2: Database & API

### Task 2.1 — SQLite database initialization
- Create `src/main/db.js`
- On app start: create database file at `app.getPath('userData')/taskking.db`
- Run `PRAGMA journal_mode = WAL` and `PRAGMA foreign_keys = ON`
- Create `tasks`, `task_tags`, and `app_config` tables if they don't exist
- Create all indexes
- Export helper functions: `getDb()` for access
- **Verify:** App starts, database file is created with correct schema

### Task 2.2 — API key generation and auth middleware
- Create `src/main/auth.js`
- On first launch: generate 32-char hex API key, store in `app_config`
- Export `getApiKey()` and `validateApiKey(req, res, next)` middleware
- Register IPC handler so renderer can call `window.taskking.getApiKey()`
- **Verify:** App starts, API key is generated and retrievable via IPC

### Task 2.3 — Express server with task CRUD routes
- Create `src/main/api.js`
- Start Express on port 7878
- Apply auth middleware to all `/api/*` routes
- Implement endpoints:
  - `GET /api/tasks` (with sort, search, tag, show_completed params)
  - `GET /api/tasks/:id`
  - `POST /api/tasks` (create with sort_order shift)
  - `PUT /api/tasks/:id` (partial update, tag replacement)
  - `DELETE /api/tasks/:id` (soft delete)
  - `POST /api/tasks/:id/undo-delete`
  - `PATCH /api/tasks/:id/complete`
  - `PATCH /api/tasks/:id/pop-to-top`
  - `PATCH /api/tasks/reorder`
  - `GET /api/settings`
  - `PUT /api/settings`
- **Verify:** Use curl or Postman to create, read, update, delete tasks via API with API key

---

## Stage 3: Frontend Core

### Task 3.1 — Svelte stores and API client
- Create `src/renderer/lib/stores.js` — all writable stores (tasks, sortMode, searchQuery, activeTagFilters, showCompleted, showDueDates, isKingView, editingTask, toastMessage)
- Create `src/renderer/lib/api.js` — HTTP client that includes API key in all requests, wraps fetch calls for each endpoint
- **Verify:** Import stores in App.svelte, confirm no errors

### Task 3.2 — Header component
- Create `src/renderer/components/Header.svelte`
- Logo (crown emoji + "TaskKing" text), task count (derived from store), "New Task" button
- Wire "New Task" button to set `editingTask` store to a new empty task object
- **Verify:** Header renders with correct styling, task count shows "0 tasks"

### Task 3.3 — Toolbar component
- Create `src/renderer/components/Toolbar.svelte`
- Search input (bound to `searchQuery` store)
- Sort dropdown (bound to `sortMode` store)
- Active filter chips (from `activeTagFilters` store, with remove button)
- **Verify:** Toolbar renders, typing in search updates store, sort dropdown changes store value

### Task 3.4 — Toggle component
- Create `src/renderer/components/Toggle.svelte`
- Reusable toggle switch with label prop
- Render three toggles in App.svelte: Show completed, Show due dates, King Task
- Bind to respective stores
- **Verify:** Toggles render, clicking them updates store values

### Task 3.5 — TaskItem component
- Create `src/renderer/components/TaskItem.svelte`
- Props: task object
- Renders: drag handle, checkbox, priority badge, task name, due date (with color coding), tags, note indicator, action buttons (pop to top, edit, delete)
- Checkbox click calls complete API
- Tag click adds to `activeTagFilters`
- Edit button sets `editingTask`
- Delete button calls delete API and triggers toast
- Due date color: red if overdue, gold if today, purple if tomorrow
- Respects `showDueDates` store (hides due date display when false)
- **Verify:** Renders a task with all visual elements matching mockup

### Task 3.6 — TaskList component
- Create `src/renderer/components/TaskList.svelte`
- Fetches tasks from API on mount (and when sort/filter/search changes)
- Renders TaskItem for each task
- Filters out completed tasks when `showCompleted` is false
- Filters by active tag filters and search query
- Integrates sortablejs for drag-and-drop (only in custom sort mode)
- On drag end: calls reorder API
- Hides drag handles when not in custom sort mode
- **Verify:** Task list renders with sample data, drag-and-drop reorders and persists

### Task 3.7 — TaskDetail component (create/edit panel)
- Create `src/renderer/components/TaskDetail.svelte`
- Slide-over panel triggered by `editingTask` store
- Form fields: name (text input), priority (1-5 selector), due date (date picker), description (textarea), tags (tag input with chips)
- Tag input: type tag, press Enter/comma to add; normalizes to lowercase; validates no spaces
- Save button: calls POST (new) or PUT (existing) API
- Delete button: calls DELETE API
- Close button / Escape key: clears `editingTask`
- **Verify:** Can create a new task, edit an existing task, see changes reflected in list

### Task 3.8 — KingView component
- Create `src/renderer/components/KingView.svelte`
- Shown when `isKingView` store is true (hides TaskList)
- Displays the #1 task from custom sort order (fetches with `sort=custom&show_completed=false`, takes first result)
- Shows: crown icon, "Your King Task" label, task name (large), priority badge, due date, tags, rendered markdown description
- Action buttons: Complete, Edit, Skip (marks complete and shows next)
- When King Task is completed, automatically shows the next task
- **Verify:** Toggle King Task mode, see the top task displayed prominently with full details

### Task 3.9 — Toast component
- Create `src/renderer/components/Toast.svelte`
- Fixed position at bottom center
- Shows message from `toastMessage` store
- Includes "Undo" button that calls undo-delete API
- Auto-dismisses after 5 seconds
- Animates in/out
- **Verify:** Delete a task, see toast appear with undo option, undo restores the task

---

## Stage 4: Markdown & URL Linking

### Task 4.1 — Markdown rendering with URL auto-linking
- Create `src/renderer/lib/utils.js`
- Configure `marked` with custom extension: detect bare URLs (http:// and https://) in text and wrap in `<a target="_blank">` tags
- Export `renderMarkdown(text)` function
- Use in KingView and TaskDetail (view mode) to render description
- **Verify:** Markdown renders correctly; bare URLs become clickable links; no XSS possible

---

## Stage 5: Settings & API Key UI

### Task 5.1 — Settings view
- Add a settings icon/button to Header
- Create a simple settings panel (can be a modal or section) showing:
  - Current API key (masked, with "Show" toggle and "Copy" button)
  - "Regenerate API Key" button with confirmation
  - API port display (7878)
- Wire to IPC calls for key retrieval and regeneration
- **Verify:** Can view API key, copy it, regenerate it

---

## Stage 6: Polish & Packaging

### Task 6.1 — Responsive layout and accessibility
- Ensure all components work at mobile viewport widths (per mockup responsive rules)
- Add ARIA labels to interactive elements (checkboxes, buttons, toggles)
- Ensure keyboard navigation works (Tab through tasks, Enter to open, Escape to close)
- Ensure color contrast meets WCAG 2.2 AA (4.5:1 for text, 3:1 for UI components)
- Add focus indicators on all interactive elements
- **Verify:** Test at 320px, 768px, 1200px widths; run accessibility audit in browser DevTools

### Task 6.2 — Electron packaging
- Configure `electron-builder.yml`
- Add build scripts to `package.json`: `build:win`, `build:mac`, `build:linux`
- Build Windows `.exe` (portable)
- Test: install and run the packaged app, verify database creation, API access, full functionality
- **Verify:** Double-click the `.exe`, app opens, create/edit/delete tasks, API key works

---

## Completion Criteria

Phase 1 is complete when:
- [ ] App launches as a desktop application (no terminal)
- [ ] Tasks can be created, edited, completed, and deleted
- [ ] Soft-delete with 5-second undo works
- [ ] All sort modes work (custom, priority, created, edited, due, alpha)
- [ ] Drag-and-drop reordering persists
- [ ] "Pop to top" works
- [ ] Tag filtering and keyword search work
- [ ] Show/hide completed toggle works
- [ ] Show/hide due dates toggle works
- [ ] King Task view shows the top custom-sort task
- [ ] Due date indicators show correct colors (red/gold/purple)
- [ ] Markdown descriptions render with auto-linked URLs
- [ ] REST API is accessible with API key authentication
- [ ] API key is viewable and regenerable in settings
- [ ] UI is responsive and WCAG 2.2 AA compliant
- [ ] App is packaged as a Windows .exe
