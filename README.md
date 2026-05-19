# 👑 TaskKing

A simple task manager / to-do list app built with the idea of focusing on one task (the "King Task") at a time.

TaskKing helps you manage tasks with flexible sorting, freeform tagging, and the **King Task** mode that shows only your top-priority task — so you can focus on one thing at a time.

I built this because, as an ADHD adult in a demanding job, I frequently get overwhelmed by the length and complexity of my to-do lists ... but without a to-do list I am adrift! The ability to see *just one task at a time*, but *still* be able to manage the complexity of all my tasks, is something I hadn't found in other applications. As a learning experience, I vibe-coded this app with the assistance of the [Amazon Kiro](https://kiro.dev) agentic AI coding assistant. 

---

## Features

- **Task management** — Create, edit, complete, and delete tasks with priority (1-5), due dates, Markdown-formatted notes, and freeform tags
- **Multiple sort modes** — Custom (drag-and-drop), Priority, Due Date, Creation Date, Last Edited, Alphabetical
- **King Task mode** — Focus view showing only your #1 task from the custom sort order
- **Search** - Keyword search against name, description, and tag in the search box 
- **Tag filtering** — Click any tag to filter by tag
- **Markdown descriptions** — Full Markdown support with auto-linked URLs
- **Soft delete with undo** — 5-second undo window after deleting a task
- **REST API** — All operations available via authenticated API for external integrations, such as your local AI agent
- **Portable** — Runs locally as a standalone desktop app on Windows, Mac, or Linux. Internet access not required.

---

## Getting Started

### Windows

#### Installation (Windows)

1. Download the latest `TaskKing-1.0.0-win64.zip` from the [Releases](https://github.com/ghritter/TaskKing/releases) page
2. Extract the zip to any folder (e.g., `C:\Programs\TaskKing\` or your Desktop)
3. Double-click `TaskKing.exe` to run

No installer required. The entire app is self-contained in the extracted folder.

**Note:** Windows SmartScreen may show a "Windows protected your PC" warning on first launch because the app is not code-signed. Click **More info** → **Run anyway** to proceed. This only happens once.

#### Run the packaged app (Windows)

1. Navigate to `dist/TaskKing-win32-x64/`
2. Double-click `TaskKing.exe`
3. Start adding tasks

The database is stored at `%APPDATA%/TaskKing/taskking.db` (Windows).

### macOS

#### Installation (macOS)

*Coming soon*

#### Run the packaged app (macOS)

*Coming soon*

### Linux

#### Installation (Linux)

*Coming soon*

#### Run the packaged app (Linux)

*Coming soon* 

### Dev Mode

#### Run in development mode

Requires Node.js v20+ is installed. 

From the command line: 

```bash
cd TaskKing
npm install
npm run dev
```

This starts the Vite dev server and Electron together. The app opens automatically.

---

## Usage

### Creating tasks

Click **+ New Task** or use the API. Each task has:

| Field | Description |
|-------|-------------|
| Name | Task title (required) |
| Priority | 1 (highest) to 5 (lowest) |
| Due date | Optional deadline |
| Description | Markdown-formatted notes |
| Tags | Freeform labels (space, comma, or Enter to add) |

### Sorting

Use the dropdown to switch between sort modes:

- **Custom Order** — Drag tasks to reorder. Use "Pop to top" (⬆) to send a task to #1.
- **Priority** — Highest priority first
- **Due Date** — Earliest deadline first
- **Created Date** — Newest first
- **Last Edited** — Most recently modified first
- **Alphabetical** — A-Z by Task title

Drag handles only appear in Custom Order mode.

### King Task mode

Toggle **👑 King Task** to enter focus mode. This shows only the top task **from your Custom Order sort** with its full description rendered. Complete it to automatically see the next task from the Custom Order sor

### Filtering

- **Search box** — Matches task names, descriptions, and tags
- **Click a tag** — Filters the list to tasks with that tag
- **Active filters** — Shown as chips below the toolbar; click × to remove

### Toggles

- **Show completed** — Hide/show completed tasks in the list
- **Show due dates** — Hide/show due date labels (reduces visual stress)

---

## API

TaskKing exposes a REST API on `http://127.0.0.1:7878` for external integrations, such as with your local AI agent. 

### Authentication

All requests require an API key in the Authorization header:

```
Authorization: Bearer YOUR_API_KEY
```

View, copy, or regenerate your API key in **Settings** (gear icon in the header). 

Note: if you regenerate the API key, any integrations relying on the previous key will no longer work.  

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tasks | List tasks (supports `sort`, `search`, `tag`, `show_completed` params) |
| GET | /api/tasks/:id | Get a single task |
| POST | /api/tasks | Create a task |
| PUT | /api/tasks/:id | Update a task (partial update) |
| DELETE | /api/tasks/:id | Soft-delete a task |
| POST | /api/tasks/:id/undo-delete | Undo a deletion (within 5 seconds) |
| PATCH | /api/tasks/:id/complete | Toggle completion |
| PATCH | /api/tasks/:id/pop-to-top | Move task to top of custom sort |
| PATCH | /api/tasks/reorder | Set custom sort order (body: `{"order": ["id1","id2",...]}`) |
| GET | /api/settings | Get app settings |
| PUT | /api/settings | Update app settings |

### Example: Create a task

```bash
curl -X POST http://127.0.0.1:7878/api/tasks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Follow up with client", "priority": 2, "due_date": "2026-05-20", "tags": ["email", "client"]}'
```

### Example API call: List tasks filtered by tag

```
GET /api/tasks?tag=client&sort=priority
```

---

## Data Storage

- **Database:** SQLite (via sql.js), stored as a single file
- **Location:** `%APPDATA%/TaskKing/taskking.db` (Windows), `~/Library/Application Support/TaskKing/taskking.db` (Mac), `~/.config/TaskKing/taskking.db` (Linux)
- **Backup:** Copy the `.db` file to back up all your tasks
- **Soft deletes:** Deleted tasks are retained for 30 days before permanent removal

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron |
| Frontend | Svelte 5 |
| Styling | Tailwind CSS + custom CSS variables |
| Backend/API | Express.js (runs in Electron main process) |
| Database | sql.js (SQLite compiled to WebAssembly) |
| Markdown | marked |
| Drag-and-drop | SortableJS |
| Build | Vite + @electron/packager |

---

## Project Structure

```
TaskKing/
├── src/
│   ├── main/           # Electron main process (API, database, auth)
│   │   ├── index.js    # App entry point
│   │   ├── api.js      # Express REST API
│   │   ├── db.js       # SQLite initialization
│   │   ├── auth.js     # API key management
│   │   └── preload.js  # IPC bridge
│   └── renderer/       # Svelte frontend
│       ├── App.svelte  # Root component
│       ├── lib/        # Stores, API client, utilities
│       └── components/ # UI components
├── build/              # Compiled frontend (Vite output)
├── dist/               # Packaged app (electron-packager output)
├── docs/               # Requirements, design, task list
└── package.json
```

---

## Building

### Build the frontend

```bash
npx vite build --config vite.config.mjs
```

### Package for Windows

```bash
npx @electron/packager . TaskKing --platform=win32 --arch=x64 --out=dist --overwrite
```

### Package for Mac

```bash
npx @electron/packager . TaskKing --platform=darwin --arch=x64 --out=dist --overwrite
```

---

## Roadmap

### Phase 2 — Quality of life
- Settings
  - Dark mode setting
  - Export/import (JSON)
  - View last 30-days deleted tasks
- Keyboard shortcuts (n=new, x=complete, t=pop to top)
- 30-day soft-delete auto-cleanup
- macOS build
- Linunx build

### Phase 3 — Cloud deployment
- Deploy as a web app (same codebase, no Electron)
- Authentication for browser access
- Accessible from any device

---

## License

MIT License. See [LICENSE](LICENSE) for details.
