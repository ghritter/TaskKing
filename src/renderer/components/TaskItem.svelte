<script>
  import { showDueDates, sortMode, activeTagFilters, editingTask, toastMessage, selectedTaskIds } from '../lib/stores.js';
  import { toggleComplete, popToTop, deleteTask } from '../lib/api.js';
  import { getDueDateStatus, getDueDateLabel } from '../lib/utils.js';
  import { CalendarDays, FilePenLine, ArrowUpToLine, Pencil, Trash, TriangleAlert } from 'lucide-svelte';

  export let task;
  export let onUpdate = () => {};

  $: isSelected = $selectedTaskIds.includes(task.id);

  $: dueDateStatus = getDueDateStatus(task.due_date);
  $: dueDateLabel = getDueDateLabel(task.due_date);

  async function handleComplete() {
    await toggleComplete(task.id);
    onUpdate();
  }

  async function handlePopToTop() {
    await popToTop(task.id);
    onUpdate();
  }

  async function handleDelete() {
    const result = await deleteTask(task.id);
    if (result) {
      $toastMessage = { text: 'Task deleted.', taskIds: [task.id] };
      onUpdate();
    }
  }

  function handleEdit() {
    $editingTask = { ...task, isNew: false };
  }

  function handleSelect(e) {
    if (e.ctrlKey || e.metaKey) {
      // Multi-select: toggle this task in selection
      if ($selectedTaskIds.includes(task.id)) {
        $selectedTaskIds = $selectedTaskIds.filter(id => id !== task.id);
      } else {
        $selectedTaskIds = [...$selectedTaskIds, task.id];
      }
    } else {
      // Single select
      $selectedTaskIds = [task.id];
    }
  }

  function handleDblClick() {
    $editingTask = { ...task, isNew: false };
  }

  function handleTagClick(tag) {
    if (!$activeTagFilters.includes(tag)) {
      $activeTagFilters = [...$activeTagFilters, tag];
    }
  }

  function getPriorityClass(p) {
    return `priority-${p}`;
  }
</script>

<div class="task-item" class:completed={task.completed} class:selected={isSelected} role="listitem" on:click={handleSelect} on:dblclick={handleDblClick}>
  <div class="drag-handle" class:hidden={$sortMode !== 'custom'} aria-hidden="true">
    <span></span><span></span><span></span>
  </div>

  <button
    class="task-checkbox"
    class:checked={task.completed}
    on:click={handleComplete}
    aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
  ></button>

  <div class="task-content">
    <div class="task-top-row">
      <span class="priority-badge {getPriorityClass(task.priority)}">P{task.priority}</span>
      <span class="task-name">{task.name}</span>
    </div>
    <div class="task-meta">
      {#if $showDueDates && task.due_date}
        <span class="task-due {dueDateStatus}">
          {#if dueDateStatus === 'overdue'}
            <TriangleAlert size={14} />
          {:else}
            <CalendarDays size={14} />
          {/if}
          {dueDateLabel}
        </span>
      {/if}
      {#if task.tags && task.tags.length > 0}
        <div class="task-tags">
          {#each task.tags as tag}
            <button class="tag" on:click|stopPropagation={() => handleTagClick(tag)}>{tag}</button>
          {/each}
        </div>
      {/if}
      {#if task.description}
        <button class="note-indicator" on:click|stopPropagation={handleEdit} aria-label="View note"><FilePenLine size={14} /> Note</button>
      {/if}
    </div>
  </div>

  <div class="task-actions">
    {#if $sortMode === 'custom'}
      <button class="btn-icon" on:click|stopPropagation={handlePopToTop} title="Pop to top" aria-label="Move task to top"><ArrowUpToLine size={16} /></button>
    {/if}
    <button class="btn-icon" on:click|stopPropagation={handleEdit} title="Edit" aria-label="Edit task"><Pencil size={16} /></button>
    <button class="btn-icon btn-icon-delete" on:click|stopPropagation={handleDelete} title="Delete" aria-label="Delete task"><Trash size={16} /></button>
  </div>
</div>

<style>
  .task-item {
    display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px;
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
    cursor: pointer; transition: all 0.15s; box-shadow: var(--shadow); position: relative;
  }
  .task-item:hover { border-color: var(--purple-border); box-shadow: var(--shadow-lg); }
  .task-item.completed { opacity: 0.5; }
  .task-item.selected { background: var(--gold-bg); border-color: var(--gold-border); }
  .task-item.completed .task-name { text-decoration: line-through; color: var(--text-muted); }
  .drag-handle {
    display: flex; flex-direction: column; gap: 2px; padding: 6px 3px;
    cursor: grab; color: var(--text-muted); opacity: 0.3; flex-shrink: 0; margin-top: 1px;
  }
  .task-item:hover .drag-handle { opacity: 0.7; }
  .drag-handle span { display: block; width: 14px; height: 2px; background: currentColor; border-radius: 1px; }
  .drag-handle.hidden { visibility: hidden; width: 0; padding: 0; margin: 0; overflow: hidden; }
  .task-checkbox {
    width: 22px; height: 22px; border: 2px solid var(--border); border-radius: 50%;
    cursor: pointer; flex-shrink: 0; display: flex; align-items: center;
    justify-content: center; margin-top: 1px; transition: all 0.15s; background: none;
  }
  .task-checkbox:hover { border-color: var(--purple); }
  .task-checkbox.checked { background: var(--green); border-color: var(--green); }
  .task-checkbox.checked::after { content: '\2713'; color: #fff; font-size: 12px; font-weight: 700; }
  .task-content { flex: 1; min-width: 0; }
  .task-top-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .priority-badge { font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 4px; flex-shrink: 0; }
  .priority-1 { background: var(--purple-bg); color: var(--purple); border: 1px solid var(--purple-border); }
  .priority-2 { background: rgba(37, 99, 235, 0.08); color: #2563eb; border: 1px solid rgba(37, 99, 235, 0.2); }
  .priority-3 { background: var(--gold-bg); color: var(--gold); border: 1px solid var(--gold-border); }
  .priority-4 { background: rgba(234, 88, 12, 0.08); color: #ea580c; border: 1px solid rgba(234, 88, 12, 0.2); }
  .priority-5 { background: rgba(120, 113, 108, 0.08); color: #78716c; border: 1px solid rgba(120, 113, 108, 0.2); }
  .task-name { font-size: 15px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .task-meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .task-due { font-size: 12px; color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px; }
  .task-due.overdue { color: var(--red); font-weight: 600; }
  .task-due.today { color: var(--gold); font-weight: 600; }
  .task-due.tomorrow { color: var(--purple); font-weight: 600; }
  .task-tags { display: flex; gap: 4px; flex-wrap: wrap; }
  .tag {
    font-size: 11px; padding: 2px 9px; border-radius: 10px; background: var(--tag-bg);
    color: var(--text-muted); font-weight: 500; cursor: pointer; transition: all 0.15s; border: none;
  }
  .tag:hover { background: var(--purple); color: #fff; }
  .note-indicator { font-size: 12px; color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px; background: none; border: none; cursor: pointer; padding: 2px 6px; border-radius: 4px; }
  .note-indicator:hover { background: var(--surface-hover); color: var(--purple); }
  .task-actions { display: flex; gap: 4px; flex-shrink: 0; opacity: 0; transition: opacity 0.15s; }
  .task-item:hover .task-actions { opacity: 1; }
  .btn-icon {
    padding: 6px; background: transparent; color: var(--text-muted); border: none;
    border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px;
  }
  .btn-icon:hover { background: var(--surface-hover); color: var(--text); }
  .btn-icon-delete { color: var(--red); }
  .btn-icon-delete:hover { background: rgba(220, 38, 38, 0.08); color: var(--red); }
</style>
