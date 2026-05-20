<script>
  import { tasks, editingTask } from '../lib/stores.js';
  import { toggleComplete, fetchTasks } from '../lib/api.js';
  import { renderMarkdown, getDueDateStatus, getDueDateLabel } from '../lib/utils.js';
  import { Crown, CalendarDays, TriangleAlert } from 'lucide-svelte';

  $: kingTask = $tasks.filter(t => !t.completed && !t.deleted)[0] || null;
  $: dueDateStatus = kingTask ? getDueDateStatus(kingTask.due_date) : null;
  $: dueDateLabel = kingTask ? getDueDateLabel(kingTask.due_date) : '';
  $: renderedDescription = kingTask ? renderMarkdown(kingTask.description) : '';

  async function handleComplete() {
    if (!kingTask) return;
    await toggleComplete(kingTask.id);
    const result = await fetchTasks({ sort: 'custom', show_completed: 'true' });
    if (result) $tasks = result.tasks;
  }

  function handleEdit() {
    if (!kingTask) return;
    $editingTask = { ...kingTask, isNew: false };
  }
</script>

<div class="king-view">
  {#if kingTask}
    <div class="king-card">
      <div class="king-crown"><Crown size={48} color="var(--gold)" /></div>
      <div class="king-label">Your King Task</div>
      <div class="king-task-name">{kingTask.name}</div>
      <div class="king-meta">
        <span class="priority-badge priority-{kingTask.priority}">P{kingTask.priority}</span>
        {#if kingTask.due_date}
          <span class="task-due {dueDateStatus}">
            {#if dueDateStatus === 'overdue'}
              <TriangleAlert size={14} />
            {:else}
              <CalendarDays size={14} />
            {/if}
            {dueDateLabel}
          </span>
        {/if}
        {#if kingTask.tags && kingTask.tags.length > 0}
          <div class="task-tags">
            {#each kingTask.tags as tag}
              <span class="tag">{tag}</span>
            {/each}
          </div>
        {/if}
      </div>
      {#if kingTask.description}
        <div class="king-description">{@html renderedDescription}</div>
      {/if}
      <div class="king-actions">
        <button class="btn btn-complete" on:click={handleComplete}>&#10003; Complete</button>
        <button class="btn btn-ghost" on:click={handleEdit}>Edit</button>
      </div>
    </div>
  {:else}
    <div class="king-empty">
      <div class="king-crown"><Crown size={48} color="var(--text-muted)" /></div>
      <p>All tasks complete. Long live the King.</p>
    </div>
  {/if}
</div>

<style>
  .king-view { padding-bottom: 80px; }
  .king-card {
    background: var(--surface); border: 2px solid var(--gold-border); border-radius: 16px;
    padding: 32px; box-shadow: 0 4px 20px rgba(184, 134, 11, 0.1); text-align: center;
    position: relative; overflow: hidden;
  }
  .king-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
    background: linear-gradient(90deg, var(--purple), var(--gold-light), var(--purple));
  }
  .king-crown { margin-bottom: 12px; display: flex; justify-content: center; }
  .king-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: var(--gold); margin-bottom: 16px; }
  .king-task-name { font-size: 24px; font-weight: 700; color: var(--text); margin-bottom: 16px; line-height: 1.3; }
  .king-meta { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
  .priority-badge { font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 4px; }
  .priority-1 { background: var(--purple-bg); color: var(--purple); border: 1px solid var(--purple-border); }
  .priority-2 { background: rgba(37, 99, 235, 0.08); color: #2563eb; border: 1px solid rgba(37, 99, 235, 0.2); }
  .priority-3 { background: var(--gold-bg); color: var(--gold); border: 1px solid var(--gold-border); }
  .priority-4 { background: rgba(234, 88, 12, 0.08); color: #ea580c; border: 1px solid rgba(234, 88, 12, 0.2); }
  .priority-5 { background: rgba(120, 113, 108, 0.08); color: #78716c; border: 1px solid rgba(120, 113, 108, 0.2); }
  .task-due { font-size: 13px; color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px; }
  .task-due.overdue { color: var(--red); font-weight: 600; }
  .task-due.today { color: var(--gold); font-weight: 600; }
  .task-due.tomorrow { color: var(--purple); font-weight: 600; }
  .task-tags { display: flex; gap: 4px; flex-wrap: wrap; }
  .tag { font-size: 11px; padding: 2px 9px; border-radius: 10px; background: var(--tag-bg); color: var(--text-muted); font-weight: 500; }
  .king-description {
    text-align: left; background: var(--bg); border-radius: var(--radius);
    padding: 16px 20px; margin: 20px 0; font-size: 14px; line-height: 1.7; color: var(--text);
  }
  .king-description :global(a) { color: var(--purple); text-decoration: underline; }
  .king-description :global(h1) { font-size: 1.6em; font-weight: 700; margin: 0.8em 0 0.4em; }
  .king-description :global(h2) { font-size: 1.4em; font-weight: 700; margin: 0.7em 0 0.3em; }
  .king-description :global(h3) { font-size: 1.2em; font-weight: 600; margin: 0.6em 0 0.3em; }
  .king-description :global(h4) { font-size: 1.1em; font-weight: 600; margin: 0.5em 0 0.2em; }
  .king-description :global(p) { margin: 0.5em 0; }
  .king-description :global(ul) { margin: 0.5em 0 0.5em 24px; list-style-type: disc; }
  .king-description :global(ol) { margin: 0.5em 0 0.5em 24px; list-style-type: decimal; }
  .king-description :global(li) { margin: 0.2em 0; }
  .king-description :global(blockquote) { border-left: 3px solid var(--purple-border); padding-left: 12px; margin: 0.5em 0; color: var(--text-muted); }
  .king-description :global(code) { background: var(--border); padding: 2px 5px; border-radius: 3px; font-size: 0.9em; }
  .king-description :global(pre) { background: var(--border); padding: 12px; border-radius: var(--radius); overflow-x: auto; margin: 0.5em 0; }
  .king-description :global(pre code) { background: none; padding: 0; }
  .king-description :global(hr) { border: none; border-top: 1px solid var(--border); margin: 1em 0; }
  .king-actions { display: flex; justify-content: center; gap: 12px; margin-top: 24px; }
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: var(--radius); font-size: 14px; font-weight: 500; cursor: pointer; border: none; transition: all 0.15s; }
  .btn-complete { background: var(--green); color: #fff; }
  .btn-complete:hover { background: #15803d; }
  .btn-ghost { background: transparent; color: var(--text-muted); border: 1px solid var(--border); }
  .btn-ghost:hover { background: var(--surface-hover); color: var(--text); }
  .king-empty { text-align: center; padding: 60px 20px; color: var(--text-muted); }
  .king-empty .king-crown { opacity: 0.5; }
  @media (max-width: 640px) { .king-card { padding: 24px 16px; } .king-task-name { font-size: 20px; } }
</style>
