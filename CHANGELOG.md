# Changelog

All notable changes to TaskKing are documented here.

---

## [1.1.0] — 2026-05-20

### Added
- **Dark mode** — Toggle in Settings > Appearance. Preference persists across sessions.
- **Export / Import** — Export all tasks as JSON from Settings > Data. Import tasks from a JSON file (appends to bottom of custom sort, preserves original timestamps).
- **View deleted tasks** — Settings > Data shows tasks deleted in the last 30 days with a Restore button.
- **30-day auto-cleanup** — Tasks deleted more than 30 days ago are permanently removed on app start.
- **Task selection** — Click a task to select it (gold highlight). Ctrl+click for multi-select.
- **Keyboard shortcuts** — `n` (new task), `x` (complete selected), `t` (pop to top), `d`/`Delete` (delete selected), `Escape` (clear selection). Complete selected, pop to top, and delete keyboard shortcuts work with multi-select.
- **Lucide SVG icons** — Replaced emoji with scalable SVG icons throughout the app (crown, calendar, edit, delete, settings, etc.).
- **Custom app icon** — Crown logo appears in the taskbar and window title bar.
- **About section** — Settings > About shows version number, copyright, license, and documentation link.
- **Search clear button** — X icon in search box to clear the current search.
- **Note indicator click-to-edit** — Single-click the Note icon to open the edit panel directly.
- **DOMPurify HTML sanitization** — All rendered Markdown is sanitized to prevent XSS.
- **Restore endpoint** — New `POST /api/tasks/:id/restore` for restoring deleted tasks without the 5-second undo time limit.
- **Import endpoint** — New `POST /api/tasks/import` for bulk importing tasks with preserved timestamps.
- **Linux build** — Packaged as a portable Linux x64 application.
- **macOS build** — Packaged as a portable macOS application (Apple Silicon only),

### Changed
- **Edit tasks via double-click** — Single click now selects a task; double-click opens the edit panel.
- **Settings panel redesigned** — Accordion-style collapsible sections (Appearance, Data, API Access, About).
- **Export/Import buttons** — Now purple to match the theme and stand out visually.
- **Search trims whitespace** — Trailing spaces no longer break tag search results.
- **Deleted tasks sorted by deletion date** — Most recently deleted shown first in Settings.
- **Import appends to bottom** — Imported tasks go to the end of custom sort order instead of the top, preserving your curated list.

### Fixed
- Search box now matches tags (previously only matched task name and description).
- Restored tasks immediately appear in the main task list.
- Deleted tasks list in Settings updates when new deletions occur.
- Toast notification now readable in dark mode (hardcoded dark background).
- External links (in About, Markdown descriptions) now open in the default browser instead of a new Electron window.


---

## [1.0.0] — 2026-05-13

### Initial Release
- Task CRUD (create, read, update, delete) with soft-delete and 5-second undo
- Task fields: name, priority (1-5), due date, Markdown description, freeform tags
- Six sort modes: Custom (drag-and-drop), Priority, Due Date, Created, Last Edited, Alphabetical
- "Pop to top" action for custom sort
- King Task focus mode — shows only the #1 task from custom sort
- Tag filtering and keyword search
- Show/hide completed tasks toggle
- Show/hide due dates toggle
- Due date color indicators (red = overdue, gold = today, purple = tomorrow)
- Markdown rendering with auto-linked URLs
- REST API on localhost:7878 with API key authentication
- Settings panel with API key view/copy/regenerate
- WCAG 2.2 AA color contrast compliance
- Responsive layout
- Packaged as portable Windows .exe
