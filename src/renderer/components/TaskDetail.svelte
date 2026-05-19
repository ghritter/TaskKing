<script>
  import { editingTask, tasks } from '../lib/stores.js';
  import { createTask, updateTask, fetchTasks } from '../lib/api.js';
  import { renderMarkdown } from '../lib/utils.js';

  let name = '';
  let description = '';
  let priority = 3;
  let due_date = '';
  let tags = [];
  let tagInput = '';
  let showPreview = false;

  $: if ($editingTask) {
    name = $editingTask.name || '';
    description = $editingTask.description || '';
    priority = $editingTask.priority || 3;
    due_date = $editingTask.due_date || '';
    tags = $editingTask.tags ? [...$editingTask.tags] : [];
    tagInput = '';
    showPreview = false;
  }

  function close() {
    $editingTask = null;
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') close();
  }

  function addTag() {
    // Split by spaces, commas, or just trim a single tag
    const parts = tagInput.split(/[\s,]+/).filter(Boolean);
    for (const part of parts) {
      const normalized = part.toLowerCase().replace(/[^a-z0-9\-_]/g, '');
      if (normalized && !tags.includes(normalized)) {
        tags = [...tags, normalized];
      }
    }
    tagInput = '';
  }

  function handleTagKeydown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  }

  function handleTagInput() {
    // Auto-commit if the user types a space
    if (tagInput.includes(' ')) {
      addTag();
    }
  }

  function removeTag(tag) {
    tags = tags.filter(t => t !== tag);
  }

  async function save() {
    if (!$editingTask) return;
    if (!name.trim()) return;

    // Commit any pending tag input
    if (tagInput.trim()) {
      addTag();
    }

    const data = {
      name: name.trim(),
      description,
      priority,
      due_date: due_date || null,
      tags
    };

    if ($editingTask.isNew) {
      await createTask(data);
    } else {
      await updateTask($editingTask.id, data);
    }

    // Refresh task list
    const result = await fetchTasks({ sort: 'custom', show_completed: 'true' });
    if (result) $tasks = result.tasks;

    close();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="overlay" on:click={close} on:keydown={handleKeydown} role="dialog" aria-modal="true" aria-label="Task editor" tabindex="-1">
  <div class="panel" on:click|stopPropagation on:keydown|stopPropagation role="document" tabindex="-1">
    <div class="panel-header">
      <h2>{$editingTask?.isNew ? 'New Task' : 'Edit Task'}</h2>
      <button class="btn-close" on:click={close} aria-label="Close">&times;</button>
    </div>

    <div class="form-group">
      <label for="task-name">Task Name</label>
      <input id="task-name" type="text" class="form-input" bind:value={name} placeholder="What needs to be done?">
    </div>

    <div class="form-group">
      <label id="priority-label">Priority</label>
      <div class="priority-selector" role="group" aria-labelledby="priority-label">
        {#each [1, 2, 3, 4, 5] as p}
          <button
            class="priority-btn"
            class:active={priority === p}
            class:p1={p === 1} class:p2={p === 2} class:p3={p === 3} class:p4={p === 4} class:p5={p === 5}
            on:click={() => priority = p}
            aria-label="Priority {p}"
            aria-pressed={priority === p}
          >{p}</button>
        {/each}
      </div>
    </div>

    <div class="form-group">
      <label for="task-due">Due Date</label>
      <input id="task-due" type="date" class="form-input" bind:value={due_date}>
    </div>

    <div class="form-group">
      <label for="task-desc">Description (Markdown)</label>
      <div class="desc-toggle">
        <button class="tab" class:active={!showPreview} on:click={() => showPreview = false}>Edit</button>
        <button class="tab" class:active={showPreview} on:click={() => showPreview = true}>Preview</button>
      </div>
      {#if showPreview}
        <div class="markdown-preview">{@html renderMarkdown(description)}</div>
      {:else}
        <textarea id="task-desc" class="form-input form-textarea" bind:value={description} placeholder="Add notes, links, details..."></textarea>
      {/if}
    </div>

    <div class="form-group">
      <label id="tags-label">Tags</label>
      <div class="tag-input-wrapper" role="group" aria-labelledby="tags-label">
        {#each tags as tag}
          <span class="tag-chip">{tag} <button class="remove-tag" on:click={() => removeTag(tag)} aria-label="Remove tag {tag}">&times;</button></span>
        {/each}
        <input
          type="text"
          bind:value={tagInput}
          on:keydown={handleTagKeydown}
          on:input={handleTagInput}
          placeholder={tags.length === 0 ? 'Add tags (space/enter to add)' : ''}
          aria-label="Add tag"
        >
      </div>
    </div>

    <div class="panel-footer">
      <button class="btn btn-ghost" on:click={close}>Cancel</button>
      <button class="btn btn-primary" on:click={save} disabled={!name.trim()}>
        {$editingTask?.isNew ? 'Create Task' : 'Save Changes'}
      </button>
    </div>
  </div>
</div>

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
  .form-group { margin-bottom: 18px; }
  .form-group label { display: block; font-size: 13px; font-weight: 500; color: var(--text-muted); margin-bottom: 6px; }
  .form-input {
    width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius);
    color: var(--text); font-size: 14px; padding: 10px 12px; outline: none; transition: border-color 0.15s;
  }
  .form-input:focus { border-color: var(--purple); }
  .form-textarea { min-height: 120px; resize: vertical; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 13px; line-height: 1.6; }
  .priority-selector { display: flex; gap: 6px; }
  .priority-btn {
    width: 36px; height: 36px; border-radius: var(--radius); border: 2px solid var(--border);
    background: var(--bg); color: var(--text-muted); font-size: 14px; font-weight: 600;
    cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center;
  }
  .priority-btn:hover { border-color: var(--text-muted); }
  .priority-btn.active.p1 { border-color: var(--purple); background: var(--purple-bg); color: var(--purple); }
  .priority-btn.active.p2 { border-color: #2563eb; background: rgba(37,99,235,0.08); color: #2563eb; }
  .priority-btn.active.p3 { border-color: var(--gold); background: var(--gold-bg); color: var(--gold); }
  .priority-btn.active.p4 { border-color: #ea580c; background: rgba(234,88,12,0.08); color: #ea580c; }
  .priority-btn.active.p5 { border-color: #78716c; background: rgba(120,113,108,0.08); color: #78716c; }
  .desc-toggle { display: flex; gap: 4px; margin-bottom: 8px; }
  .tab { padding: 4px 12px; font-size: 12px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); cursor: pointer; color: var(--text-muted); }
  .tab.active { background: var(--purple); color: #fff; border-color: var(--purple); }
  .markdown-preview {
    background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 12px; min-height: 120px; font-size: 14px; line-height: 1.6;
  }
  .markdown-preview :global(a) { color: var(--purple); text-decoration: underline; }
  .markdown-preview :global(h1) { font-size: 1.6em; font-weight: 700; margin: 0.8em 0 0.4em; }
  .markdown-preview :global(h2) { font-size: 1.4em; font-weight: 700; margin: 0.7em 0 0.3em; }
  .markdown-preview :global(h3) { font-size: 1.2em; font-weight: 600; margin: 0.6em 0 0.3em; }
  .markdown-preview :global(h4) { font-size: 1.1em; font-weight: 600; margin: 0.5em 0 0.2em; }
  .markdown-preview :global(p) { margin: 0.5em 0; }
  .markdown-preview :global(ul) { margin: 0.5em 0 0.5em 24px; list-style-type: disc; }
  .markdown-preview :global(ol) { margin: 0.5em 0 0.5em 24px; list-style-type: decimal; }
  .markdown-preview :global(li) { margin: 0.2em 0; }
  .markdown-preview :global(blockquote) { border-left: 3px solid var(--purple-border); padding-left: 12px; margin: 0.5em 0; color: var(--text-muted); }
  .markdown-preview :global(code) { background: var(--border); padding: 2px 5px; border-radius: 3px; font-size: 0.9em; }
  .markdown-preview :global(pre) { background: var(--border); padding: 12px; border-radius: var(--radius); overflow-x: auto; margin: 0.5em 0; }
  .markdown-preview :global(pre code) { background: none; padding: 0; }
  .tag-input-wrapper {
    display: flex; flex-wrap: wrap; gap: 6px; background: var(--bg);
    border: 1px solid var(--border); border-radius: var(--radius); padding: 8px 10px;
    min-height: 42px; align-items: center; cursor: text;
  }
  .tag-input-wrapper:focus-within { border-color: var(--purple); }
  .tag-chip {
    display: flex; align-items: center; gap: 4px; background: var(--purple);
    color: #fff; font-size: 12px; padding: 3px 8px; border-radius: 10px; font-weight: 500;
  }
  .remove-tag { background: none; border: none; color: #fff; cursor: pointer; font-size: 14px; opacity: 0.7; padding: 0; }
  .remove-tag:hover { opacity: 1; }
  .tag-input-wrapper input { background: none; border: none; color: var(--text); font-size: 13px; outline: none; flex: 1; min-width: 80px; }
  .tag-input-wrapper input::placeholder { color: var(--text-muted); }
  .panel-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--border); }
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: var(--radius); font-size: 14px; font-weight: 500; cursor: pointer; border: none; transition: all 0.15s; }
  .btn-primary { background: var(--purple); color: #fff; }
  .btn-primary:hover { background: var(--purple-light); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-ghost { background: transparent; color: var(--text-muted); border: 1px solid var(--border); }
  .btn-ghost:hover { background: var(--surface-hover); color: var(--text); }
  @media (max-width: 640px) { .panel { width: 100%; } }
</style>
