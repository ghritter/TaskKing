<script>
  import { onMount, afterUpdate } from 'svelte';
  import { tasks, sortMode, showCompleted } from '../lib/stores.js';
  import { reorderTasks, fetchTasks } from '../lib/api.js';
  import TaskItem from './TaskItem.svelte';
  import Sortable from 'sortablejs';

  let listEl;
  let sortableInstance = null;
  let currentSortMode = 'custom';

  onMount(() => {
    return () => {
      if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
      }
    };
  });

  afterUpdate(() => {
    if ($sortMode !== currentSortMode || (!sortableInstance && $sortMode === 'custom')) {
      currentSortMode = $sortMode;
      setupSortable();
    }
  });

  function setupSortable() {
    if (sortableInstance) {
      sortableInstance.destroy();
      sortableInstance = null;
    }
    if (!listEl || $sortMode !== 'custom') return;

    sortableInstance = Sortable.create(listEl, {
      animation: 150,
      handle: '.drag-handle',
      ghostClass: 'sortable-ghost',
      onEnd: async () => {
        const items = listEl.querySelectorAll('[data-id]');
        const order = Array.from(items).map(el => el.dataset.id);
        await reorderTasks(order);
        await refreshTasks();
      }
    });
  }

  async function refreshTasks() {
    const result = await fetchTasks({ sort: $sortMode, show_completed: String($showCompleted) });
    if (result) $tasks = result.tasks;
  }
</script>

<div class="task-list" bind:this={listEl} role="list" aria-label="Task list">
  {#each $tasks as task (task.id)}
    <div data-id={task.id}>
      <TaskItem {task} onUpdate={refreshTasks} />
    </div>
  {/each}
  {#if $tasks.length === 0}
    <div class="empty-state">
      <p>No tasks yet. Click <strong>+ New Task</strong> to get started.</p>
    </div>
  {/if}
</div>

<style>
  .task-list { display: flex; flex-direction: column; gap: 8px; padding-bottom: 80px; }
  .empty-state {
    text-align: center; padding: 60px 20px; color: var(--text-muted); font-size: 15px;
  }
  :global(.sortable-ghost) { opacity: 0.4; }
</style>
