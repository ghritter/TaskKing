# 👑 TaskKing

A simple task manager / to-do list app built with the idea of focusing on one task (the "King Task") at a time.

TaskKing helps you manage tasks with flexible sorting, freeform tagging, and the **King Task** mode that shows only your top-priority task — so you can focus on one thing at a time.

I built this because, as an ADHD adult in a demanding job, I frequently get overwhelmed by the length and complexity of my to-do lists ... but without a to-do list I am adrift! The ability to see *just one task at a time*, but *still* be able to manage the complexity of *all** my tasks, is something I hadn't found in other applications. As a learning experience, I "vibe-coded" this app with the assistance of the [Amazon Kiro](https://kiro.dev) agentic AI coding assistant. 


---

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [API](#api)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Data Storage](#data-storage)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Building](#building)
- [Roadmap](#roadmap)
- [License](#license)


---

## Features

- **Task management** — Create, edit, complete, and delete tasks with priority (1-5), due dates, Markdown-formatted notes, and freeform tags
- **Multiple sort modes** — Custom (drag-and-drop), Priority, Due Date, Creation Date, Last Edited, Alphabetical
- **King Task mode** — Focus view showing *only* your #1 task from the custom sort order
- **Task selection** — Click to select, Ctrl+click for multi-select. Act on selected tasks with keyboard shortcuts.
- **Keyboard shortcuts** — `n` (new), `x` (complete), `t` (pop to top), `d` (delete), `Escape` (clear)
- **Search** — Keyword search against name, description, and tags
- **Tag filtering** — Click any tag to filter by tag
- **Markdown descriptions** — Full Markdown support with auto-linked URLs
- **Dark mode** — Toggle between light and dark themes in Settings
- **Export / Import** — Back up and restore tasks as JSON
- **Soft delete with undo** — 5-second undo window; deleted tasks recoverable for 30 days via Settings
- **REST API** — All operations available via authenticated API for external integrations, such as your local AI agent
- **Portable** — Runs locally as a standalone desktop app on Windows, macOS, or Linux. Internet access not required. 



[Back to top](#-taskking)

---

## Getting Started

### Windows

#### Installation (Windows)

1. Download the latest release from the [Releases](https://github.com/ghritter/TaskKing/releases) page
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

#### Installation (macOS — Apple Silicon)

1. Download the latest `TaskKing-1.1.0-darwin-arm64.zip` from the [Releases](https://github.com/ghritter/TaskKing/releases) page
2. Extract the zip
3. Drag `TaskKing.app` to your Applications folder
4. Double-click to run

**Note:** macOS Gatekeeper may block the app on first launch because it's not code-signed. Right-click the app → **Open** → **Open** to bypass. This only happens once.

The database is stored at `~/Library/Application Support/TaskKing/taskking.db`.

### Linux

#### Installation (Linux)

1. Download the latest `TaskKing-1.1.0-linux-x64.zip` from the [Releases](https://github.com/ghritter/TaskKing/releases) page
2. Extract the zip to any folder (e.g., `~/Applications/TaskKing/`)
3. Run `./TaskKing` from the extracted folder (you may need to `chmod +x TaskKing` first)

The database is stored at `~/.config/TaskKing/taskking.db`.

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



[Back to top](#-taskking)

---

## Usage

### Creating tasks

Click **+ New Task**, use the `n` keyboard shortcut, or use the API. Each task has:

| Field | Description |
|-------|-------------|
| Name | Task title (required) |
| Priority | 1 (highest) to 5 (lowest) - default is 3 |
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

Toggle **King Task** to enter focus mode. This shows only the top task **from your Custom Order sort** with its full description rendered. Complete it to automatically see the next task from the Custom Order sort.

### Filtering

- **Search box** — Matches against task names, descriptions, and tags. Click the `X` icon to clear the search box. 
- **Click a tag** — Filters the list to tasks with that tag
- **Active filters** — Shown as chips below the toolbar; click × to remove

### Toggles

- **Show completed** — Hide/show completed tasks in the list
- **Show due dates** — Hide/show due date labels (reduces visual stress arounding impending due dates)



[Back to top](#-taskking)

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

### Example 1: Create a task

```bash
curl -X POST http://127.0.0.1:7878/api/tasks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Follow up with client", "priority": 2, "due_date": "2026-05-20", "tags": ["email", "client"]}'
```

### Example 2: List tasks filtered by tag

```
GET /api/tasks?tag=client&sort=priority
```



[Back to top](#-taskking)

---

## Data Storage

- **Database:** SQLite (via sql.js), stored as a single file
- **Location:** `%APPDATA%/TaskKing/taskking.db` (Windows), `~/Library/Application Support/TaskKing/taskking.db` (Mac), `~/.config/TaskKing/taskking.db` (Linux)
- **Backup:** Copy the `.db` file to back up all your tasks
- **Soft deletes:** Deleted tasks are retained for 30 days before permanent removal



[Back to top](#-taskking)

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



[Back to top](#-taskking)

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



[Back to top](#-taskking)

---

## Building

### Build the frontend

```bash
npx vite build --config vite.config.mjs
```

### Package for Windows

```bash
npx @electron/packager . TaskKing --platform=win32 --arch=x64 --out=dist --overwrite --icon=src/renderer/assets/icon.ico
```

### Package for Mac (Apple Silicon)

```bash
npx @electron/packager . TaskKing --platform=darwin --arch=arm64 --out=dist --overwrite --icon=src/renderer/assets/icon.icns
```

Note: macOS builds require a Mac or admin privileges on Windows (for symlink creation). electron-packager requires an `.icns` file for macOS icons (not `.png`); run `node scripts/generate-icon.js` to regenerate `icon.icns` if the source `crown-logo.svg` changes.

### Package for Linux

```bash
npx @electron/packager . TaskKing --platform=linux --arch=x64 --out=dist --overwrite --icon=src/renderer/assets/icon-256.png
```



[Back to top](#-taskking)

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `n` | New task |
| `x` | Complete selected task(s) |
| `t` | Pop selected task to top of custom sort |
| `d` or `Delete` | Delete selected task(s) |
| `Escape` | Clear selection / close panel |

Shortcuts are disabled when typing in an input field or when a panel is open.



[Back to top](#-taskking)

---

## Roadmap

### Phase 1 - Initial release 
- Completed and released as v1.0.0. 

### Phase 2 - Quality of life updates
- Completed and released as v1.1.0.

### Phase 3 — Cloud deployment
- Deployable as a web app (same codebase, no Electron)
  - Authentication for browser access
  - Accessible from any device
- Features/enhancements
  - Improved tag management
  - Calendar picker improvements in dark mode



[Back to top](#-taskking)

---

## License

MIT License. See [LICENSE](LICENSE) for details.
