# TaskKing — Requirements Specification

## Overview

TaskKing is a personal task management application with a focus on simplicity, speed, and single-task focus. It runs as a desktop application locally, with a future option to deploy as a cloud web app for multi-device access.

**Audience:** Single user (gritter)
**Purpose:** Manage personal tasks with flexible sorting, tagging, and a "King Task" focus mode

---

## Architecture

### Local Mode
- **Runtime:** Electron desktop application (Windows, Mac, Linux)
- **Frontend:** Svelte (compiled to JS, runs in Electron's renderer process)
- **Backend:** Express.js API running in Electron's main process
- **Database:** SQLite via `better-sqlite3`, stored in user's app data directory
- **API:** REST API exposed on localhost for external integrations (e.g., Kiro)

### Cloud Mode (Phase 3, future)
- Same Svelte frontend + Express API + SQLite, deployed as a Node.js web app
- Hosted on a single server (ECS/Fargate or Lightsail) with persistent storage
- Authentication layer (Cognito or API key) in front
- Accessible from any browser on any device

### Key Architectural Principle
The UI and API are built as a standalone web application. Electron is a thin wrapper for local use. The same codebase deploys to the cloud without modification to the core logic.

---

## Phase 1 — MVP

### Task Data Model

Each task has the following fields:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | Auto | Primary key |
| name | String | Yes | Task title (max 255 chars) |
| description | Markdown text | No | Supports Markdown rendering; plain-text URLs auto-link |
| priority | Integer (1-5) | Yes | 1 = highest, 5 = lowest |
| due_date | Date | No | Optional deadline |
| created_at | Timestamp | Auto | Set on creation, immutable |
| updated_at | Timestamp | Auto | Updated on any edit |
| completed | Boolean | Yes | Default: false |
| completed_at | Timestamp | Auto | Set when completed, cleared when uncompleted |
| deleted | Boolean | Yes | Default: false (soft delete) |
| deleted_at | Timestamp | Auto | Set on soft delete |
| sort_order | Integer | Yes | Position in custom sort (lower = higher in list) |
| tags | Array of strings | No | 0-n tags per task |

#### Tag Rules
- Tags are freeform strings
- Tags must not contain spaces
- Tags are normalized to lowercase on save
- Tags are stored in a separate table (task_tags) with a foreign key to the task

### Task Operations (CRUD)

- **Create:** Add a new task with name (required), priority, due date, description, and tags
- **Read:** View task list, view individual task detail
- **Update:** Edit any field. Updates `updated_at` automatically
- **Delete:** Soft-delete with 5-second undo toast. Soft-deleted tasks retained for 30 days, then permanently purged
- **Complete/Uncomplete:** Toggle completion status

### TaskList View

The primary view showing all tasks in a single list.

#### Sorting
The list supports the following sort modes (one active at a time):

1. **Custom sort** (default) — User-defined order via drag-and-drop
   - "Pop to top" action on each task sends it to position 1
   - Order persists across sessions
2. **Priority** — Sorted by priority value (1 first, 5 last)
3. **Creation date** — Newest first
4. **Last edited date** — Most recently edited first
5. **Due date** — Earliest due date first; tasks without due dates appear at the end
6. **Alphabetical** — A-Z by task name

#### Filtering & Search
- Filter by tag (clicking a tag filters to tasks with that tag)
- Search by keyword (matches against task name and description)
- Filters and search can be combined
- Active filters are displayed and individually removable

#### Toggles
- **Show/hide completed tasks** — Hides or shows tasks where `completed = true`
- **Show/hide due dates** — Hides or shows due date display on task items (data is retained, just not shown)
- **King Task mode** — Switches to King Task view (see below)

### King Task View

A focus mode that shows only the #1 task from the Custom Sort order.

- Displays the single top-priority task prominently
- Shows all task details (name, description rendered as Markdown, priority, due date, tags)
- Provides complete/edit/delete actions
- When the King Task is completed or deleted, the next task in custom sort becomes the new King
- Visual treatment distinguishes this from the list view (larger, more prominent)

### REST API

All task operations are available via REST API on localhost:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tasks | List all tasks (supports query params for sort, filter, search) |
| GET | /api/tasks/:id | Get single task |
| POST | /api/tasks | Create task |
| PUT | /api/tasks/:id | Update task |
| DELETE | /api/tasks/:id | Soft-delete task |
| PATCH | /api/tasks/:id/complete | Toggle completion |
| PATCH | /api/tasks/:id/sort | Update sort position (pop to top, reorder) |
| PATCH | /api/tasks/reorder | Bulk reorder (for drag-and-drop) |

#### API Authentication
- All API endpoints require a valid API key passed via `Authorization: Bearer <key>` header
- This applies in both local and cloud modes
- The app generates a random API key on first launch, stored in the app's config directory
- The user can view and regenerate the API key from the app's settings
- The Electron UI itself bypasses API key auth (it's the same process), but any external caller (Kiro, scripts, other apps) must provide the key
- Requests without a valid key receive a `401 Unauthorized` response

### User Experience

#### Visual Design
- Light-colored background
- Purple and gold color theme (royal/king motif)
- Center-aligned layout
- Responsive (works on different viewport sizes)
- WCAG 2.2 AA compliant (color contrast, keyboard navigation, screen reader support, focus indicators)

#### Interaction
- Drag-and-drop for custom sort reordering
- Click task to view/edit details
- Inline completion toggle (checkbox)
- Slide-over or modal panel for task creation/editing
- Toast notification for undo on delete (5-second window)

#### Markdown Rendering
- Task descriptions render Markdown when viewing
- Plain-text URLs (http:// and https://) auto-convert to clickable links
- Edit mode shows raw Markdown text

---

## Phase 2 — Quality of Life

- **Dark mode toggle** — Alternate dark theme, preference persisted
- **Keyboard shortcuts:**
  - `n` — New task
  - `x` — Mark selected task complete
  - `t` — Pop selected task to top
  - `Escape` — Close modal/panel
  - Arrow keys — Navigate task list
- **Due date indicators:**
  - Red — Overdue
  - Gold — Due today
  - Purple — Due tomorrow
- **Show/hide due dates toggle** — Already in Phase 1 (listed here for visibility)
- **URL auto-linking** — Already in Phase 1 (listed here for visibility)
- **Export/Import:**
  - Export all tasks as JSON file
  - Import tasks from JSON file
  - Useful for backup and migration between local/cloud
- **30-day soft-delete cleanup** — Background job purges tasks deleted more than 30 days ago

---

## Phase 3 — Cloud Deployment

- **Cloud hosting** — Single container (ECS/Fargate or Lightsail) with persistent volume for SQLite
- **Auth layer** — Cognito or simple token-based auth for browser access (extends the API key model from Phase 1)
- **Bulk actions** — Select multiple tasks to tag, complete, or delete
- **Data model supports bulk operations** from Phase 1 (no schema changes needed)

---

## Non-Functional Requirements

- **Performance:** App should load in under 1 second. Task operations should feel instant (<100ms perceived latency)
- **Data safety:** SQLite database stored in a standard, discoverable location. No data loss on app crash (SQLite WAL mode)
- **Portability:** Database is a single file that can be copied/backed up
- **OS-agnostic:** Electron builds for Windows, Mac, and Linux
- **No internet required:** Fully functional offline in local mode
- **Lightweight:** Minimal dependencies. No heavy frameworks beyond Svelte + Electron

---

## Out of Scope

- Multi-user / collaboration
- Recurring tasks
- Subtasks / task hierarchy
- Calendar integration
- Notifications / reminders
- File attachments
- Time tracking
