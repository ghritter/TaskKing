<script>
  import { onMount } from 'svelte';
  import { tasks } from '../lib/stores.js';
  import { fetchTasks, updateSettings } from '../lib/api.js';
  import { ChevronDown } from 'lucide-svelte';

  export let visible = false;
  export let onClose = () => {};
  export let onThemeChange = () => {};
  export let onTasksChanged = () => {};

  // Accordion state
  let openSection = 'appearance';

  // API section
  let apiKey = '';
  let showKey = false;
  let copied = false;
  let port = 7878;
  let appVersion = '';

  // Appearance section
  let darkMode = false;

  // Data section
  let deletedTasks = [];
  let loadingDeleted = false;
  let exportStatus = '';

  onMount(async () => {
    if (window.taskking) {
      apiKey = await window.taskking.getApiKey();
      port = await window.taskking.getPort();
      appVersion = await window.taskking.getVersion();
    }
    // Load dark mode preference
    const saved = localStorage.getItem('taskking-theme');
    darkMode = saved === 'dark';
  });

  function toggleSection(name) {
    openSection = openSection === name ? null : name;
  }

  // --- Appearance ---
  function toggleDarkMode() {
    darkMode = !darkMode;
    const theme = darkMode ? 'dark' : 'light';
    localStorage.setItem('taskking-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    onThemeChange(theme);
  }

  // --- API ---
  async function regenerate() {
    if (!confirm('Regenerate API key? Any external apps using the current key will need to be updated.')) return;
    if (window.taskking) {
      apiKey = await window.taskking.regenerateApiKey();
      showKey = true;
    }
  }

  async function copyKey() {
    await navigator.clipboard.writeText(apiKey);
    copied = true;
    setTimeout(() => { copied = false; }, 2000);
  }

  // --- Data: Export ---
  async function exportTasks() {
    exportStatus = 'Exporting...';
    const result = await fetchTasks({ show_completed: 'true', show_deleted: 'false' });
    if (result && result.tasks) {
      const data = JSON.stringify(result.tasks, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `taskking-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      exportStatus = 'Exported!';
      setTimeout(() => { exportStatus = ''; }, 2000);
    } else {
      exportStatus = 'Export failed.';
      setTimeout(() => { exportStatus = ''; }, 3000);
    }
  }

  // --- Data: Import ---
  let importInput;
  let importStatus = '';

  function triggerImport() {
    importInput.click();
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    importStatus = 'Importing...';
    try {
      const text = await file.text();
      const importedTasks = JSON.parse(text);
      if (!Array.isArray(importedTasks)) {
        importStatus = 'Invalid file: expected an array of tasks.';
        setTimeout(() => { importStatus = ''; }, 3000);
        return;
      }

      const res = await fetch(`http://127.0.0.1:${port}/api/tasks/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ tasks: importedTasks })
      });

      if (res.ok) {
        const result = await res.json();
        importStatus = `Imported ${result.imported} task${result.imported !== 1 ? 's' : ''}.`;
        onTasksChanged();
      } else {
        importStatus = 'Import failed.';
      }
      setTimeout(() => { importStatus = ''; }, 3000);
    } catch (err) {
      importStatus = 'Import failed: invalid JSON file.';
      setTimeout(() => { importStatus = ''; }, 3000);
    }
    // Reset file input
    e.target.value = '';
  }

  // --- Data: Deleted tasks ---
  async function loadDeletedTasks() {
    loadingDeleted = true;
    const result = await fetchTasks({ show_completed: 'true', show_deleted: 'true' });
    if (result && result.tasks) {
      // Filter to only deleted tasks, sort by deleted_at descending
      deletedTasks = result.tasks
        .filter(t => t.deleted)
        .sort((a, b) => {
          if (!a.deleted_at) return 1;
          if (!b.deleted_at) return -1;
          return new Date(b.deleted_at) - new Date(a.deleted_at);
        });
    }
    loadingDeleted = false;
  }

  async function restoreTask(id) {
    await fetch(`http://127.0.0.1:${port}/api/tasks/${id}/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    // Reload deleted list and refresh main task list
    await loadDeletedTasks();
    onTasksChanged();
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') onClose();
  }

  // Load deleted tasks when Data section opens
  $: if (openSection === 'data') {
    loadDeletedTasks();
  }

  // Reload deleted tasks when the panel becomes visible (catches new deletions)
  $: if (visible && openSection === 'data') {
    loadDeletedTasks();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if visible}
  <div class="overlay" on:click={onClose} on:keydown={handleKeydown} role="dialog" aria-modal="true" aria-label="Settings" tabindex="-1">
    <div class="panel" on:click|stopPropagation on:keydown|stopPropagation tabindex="-1" role="document">
      <div class="panel-header">
        <h2>Settings</h2>
        <button class="btn-close" on:click={onClose} aria-label="Close">&times;</button>
      </div>

      <!-- APPEARANCE SECTION -->
      <div class="accordion-section">
        <button class="accordion-header" on:click={() => toggleSection('appearance')} aria-expanded={openSection === 'appearance'}>
          <span class="accordion-title">Appearance</span>
          <span class="accordion-chevron" class:open={openSection === 'appearance'}><ChevronDown size={16} /></span>
        </button>
        {#if openSection === 'appearance'}
          <div class="accordion-body">
            <div class="field toggle-field">
              <span class="toggle-label-text">Dark mode</span>
              <label class="toggle">
                <input type="checkbox" checked={darkMode} on:change={toggleDarkMode} aria-label="Toggle dark mode">
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        {/if}
      </div>

      <!-- DATA SECTION -->
      <div class="accordion-section">
        <button class="accordion-header" on:click={() => toggleSection('data')} aria-expanded={openSection === 'data'}>
          <span class="accordion-title">Data</span>
          <span class="accordion-chevron" class:open={openSection === 'data'}><ChevronDown size={16} /></span>
        </button>
        {#if openSection === 'data'}
          <div class="accordion-body">
            <h4 class="subsection-header">Import / Export</h4>
            <p class="section-desc">Export downloads all active and completed tasks as JSON (deleted tasks are not included). Import creates new tasks from a JSON file.</p>
            <div class="field">
              <div class="btn-row">
                <button class="btn-action" on:click={exportTasks}>Export tasks (JSON)</button>
                <button class="btn-action" on:click={triggerImport}>Import tasks (JSON)</button>
              </div>
              {#if exportStatus}<p class="field-note">{exportStatus}</p>{/if}
              {#if importStatus}<p class="field-note">{importStatus}</p>{/if}
              <input type="file" accept=".json" bind:this={importInput} on:change={handleImport} class="hidden-input" aria-label="Import file">
            </div>

            <h4 class="subsection-header">Recently Deleted</h4>
            <p class="section-desc">Tasks deleted in the last 30 days are shown below (sorted by deletion date, most recent first). After 30 days they are permanently removed.</p>
            <div class="field">
              {#if loadingDeleted}
                <p class="field-note">Loading...</p>
              {:else if deletedTasks.length === 0}
                <p class="field-note">No deleted tasks.</p>
              {:else}
                <div class="deleted-list">
                  {#each deletedTasks as task}
                    <div class="deleted-item">
                      <span class="deleted-name">{task.name}</span>
                      <span class="deleted-date">deleted {task.deleted_at ? new Date(task.deleted_at).toLocaleDateString() : ''}</span>
                      <button class="btn-restore" on:click={() => restoreTask(task.id)}>Restore</button>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>

      <!-- API ACCESS SECTION -->
      <div class="accordion-section">
        <button class="accordion-header" on:click={() => toggleSection('api')} aria-expanded={openSection === 'api'}>
          <span class="accordion-title">API Access</span>
          <span class="accordion-chevron" class:open={openSection === 'api'}><ChevronDown size={16} /></span>
        </button>
        {#if openSection === 'api'}
          <div class="accordion-body">
            <p class="section-desc">External apps (like Kiro) use this key to access the TaskKing API.</p>

            <div class="field">
              <label>API Key</label>
              <div class="key-row">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  readonly
                  class="key-input"
                  aria-label="API key"
                >
                <button class="btn-sm" on:click={() => showKey = !showKey}>
                  {showKey ? 'Hide' : 'Show'}
                </button>
                <button class="btn-sm" on:click={copyKey}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div class="field">
              <label>API Endpoint</label>
              <div class="key-row">
                <input type="text" value="http://127.0.0.1:{port}" readonly class="key-input" aria-label="API endpoint">
              </div>
            </div>

            <div class="field">
              <button class="btn-danger" on:click={regenerate}>Regenerate API Key</button>
              <p class="field-note">This will invalidate the current key immediately.</p>
            </div>

            <div class="field">
              <label>Usage Example</label>
              <pre class="code-block">curl -X POST http://127.0.0.1:{port}/api/tasks \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{JSON.stringify({name: "New task", priority: 2, tags: ["example"]})}'</pre>
            </div>
          </div>
        {/if}
      </div>

      <!-- ABOUT SECTION -->
      <div class="accordion-section">
        <button class="accordion-header" on:click={() => toggleSection('about')} aria-expanded={openSection === 'about'}>
          <span class="accordion-title">About</span>
          <span class="accordion-chevron" class:open={openSection === 'about'}><ChevronDown size={16} /></span>
        </button>
        {#if openSection === 'about'}
          <div class="accordion-body">
            <div class="about-info">
              <p class="about-name">TaskKing</p>
              <p class="about-version">Version {appVersion || '1.1.0'}</p>
              <p class="about-link"><a href="https://github.com/ghritter/TaskKing/tree/main#-taskking" target="_blank" rel="noopener noreferrer">Documentation</a></p>
              <p class="about-copyright">&copy; 2026 by Greg Ritter. <a href="https://github.com/ghritter/TaskKing/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">MIT License</a></p>
              <p class="about-link"><a href="https://github.com/ghritter/TaskKing" target="_blank" rel="noopener noreferrer">github.com/ghritter/TaskKing</a></p>
            </div>
          </div>
        {/if}
      </div>

    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 200;
    display: flex; justify-content: flex-end;
  }
  .panel {
    width: 480px; max-width: 100%; background: var(--surface);
    border-left: 1px solid var(--border); height: 100%; overflow-y: auto; padding: 24px;
    animation: slideIn 0.2s ease;
  }
  @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
  .panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
  .panel-header h2 { font-size: 18px; font-weight: 600; }
  .btn-close { background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-muted); padding: 4px 8px; }
  .btn-close:hover { color: var(--text); }

  /* Accordion */
  .accordion-section { border-bottom: 1px solid var(--border); }
  .accordion-header {
    display: flex; align-items: center; justify-content: space-between;
    width: 100%; padding: 14px 0; background: none; border: none;
    cursor: pointer; font-size: 15px; font-weight: 600; color: var(--text); text-align: left;
  }
  .accordion-header:hover { color: var(--purple); }
  .accordion-chevron { color: var(--text-muted); transition: transform 0.2s; display: flex; align-items: center; }
  .accordion-chevron.open { transform: rotate(180deg); }
  .accordion-body { padding: 4px 0 18px; }

  /* Subsection headers */
  .subsection-header { font-size: 14px; font-weight: 600; color: var(--text); margin: 12px 0 6px; }

  /* Fields */
  .section-desc { font-size: 13px; color: var(--text-muted); margin-bottom: 12px; }
  .field { margin-bottom: 16px; }
  .field label { display: block; font-size: 12px; font-weight: 500; color: var(--text-muted); margin-bottom: 6px; }
  .field-note { font-size: 12px; color: var(--text-muted); margin-top: 6px; }
  .key-row { display: flex; gap: 8px; align-items: center; }
  .key-input {
    flex: 1; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius);
    color: var(--text); font-size: 13px; padding: 8px 10px; font-family: monospace; outline: none;
  }
  .btn-sm {
    padding: 6px 12px; font-size: 12px; font-weight: 500; border-radius: var(--radius);
    border: 1px solid var(--border); background: var(--surface); color: var(--text-muted);
    cursor: pointer; white-space: nowrap;
  }
  .btn-sm:hover { background: var(--surface-hover); color: var(--text); }
  .btn-action {
    padding: 8px 16px; font-size: 13px; font-weight: 500; border-radius: var(--radius);
    border: 1px solid var(--purple-border); background: var(--purple-bg); color: var(--purple);
    cursor: pointer; white-space: nowrap;
  }
  .btn-action:hover { background: var(--purple); color: #fff; }
  .btn-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .btn-danger {
    padding: 8px 16px; font-size: 13px; font-weight: 500; border-radius: var(--radius);
    border: 1px solid var(--red); background: transparent; color: var(--red); cursor: pointer;
  }
  .btn-danger:hover { background: rgba(220, 38, 38, 0.06); }
  .code-block {
    background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 12px; font-size: 12px; font-family: monospace; line-height: 1.5;
    overflow-x: auto; white-space: pre-wrap; word-break: break-all; color: var(--text-muted);
  }
  .hidden-input { display: none; }

  /* Toggle */
  .toggle-field { display: flex; align-items: center; justify-content: space-between; }
  .toggle-label-text { font-size: 14px; color: var(--text); }
  .toggle { position: relative; width: 36px; height: 20px; cursor: pointer; display: inline-block; }
  .toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
  .toggle-slider { position: absolute; inset: 0; background: var(--border); border-radius: 20px; transition: background 0.2s; }
  .toggle-slider::before {
    content: ''; position: absolute; width: 16px; height: 16px; left: 2px; top: 2px;
    background: #fff; border-radius: 50%; transition: transform 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.15);
  }
  .toggle input:checked + .toggle-slider { background: var(--purple); }
  .toggle input:checked + .toggle-slider::before { transform: translateX(16px); }

  /* Deleted tasks list */
  .deleted-list { max-height: 200px; overflow-y: auto; }
  .deleted-item {
    display: flex; align-items: center; gap: 8px; padding: 8px 0;
    border-bottom: 1px solid var(--border); font-size: 13px;
  }
  .deleted-item:last-child { border-bottom: none; }
  .deleted-name { flex: 1; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .deleted-date { color: var(--text-muted); font-size: 11px; flex-shrink: 0; font-style: italic; }
  .btn-restore {
    padding: 4px 10px; font-size: 11px; font-weight: 500; border-radius: var(--radius);
    border: 1px solid var(--purple-border); background: var(--purple-bg); color: var(--purple);
    cursor: pointer; flex-shrink: 0;
  }
  .btn-restore:hover { background: var(--purple); color: #fff; }

  @media (max-width: 640px) { .panel { width: 100%; } }

  /* About */
  .about-info { text-align: center; padding: 8px 0; }
  .about-name { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
  .about-version { font-size: 13px; color: var(--text-muted); margin-bottom: 12px; }
  .about-copyright { font-size: 13px; color: var(--text-muted); margin-bottom: 4px; }
  .about-copyright a { color: var(--purple); text-decoration: underline; }
  .about-link { font-size: 13px; }
  .about-link a { color: var(--purple); text-decoration: underline; }
</style>
