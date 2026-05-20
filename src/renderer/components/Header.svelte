<script>
  import { tasks, editingTask } from '../lib/stores.js';
  import { Settings as SettingsIcon } from 'lucide-svelte';
  import crownLogo from '../assets/crown-logo.svg';

  export let onSettingsClick = () => {};

  $: activeCount = $tasks.filter(t => !t.completed).length;
  $: completedCount = $tasks.filter(t => t.completed).length;

  function newTask() {
    $editingTask = { isNew: true, name: '', description: '', priority: 3, due_date: null, tags: [] };
  }
</script>

<header class="header">
  <div class="logo">
    <img src={crownLogo} alt="TaskKing logo" class="logo-icon" />
    <span class="logo-text">TaskKing</span>
    <span class="task-count">{activeCount} active &middot; {completedCount} completed</span>
  </div>
  <div class="header-actions">
    <button class="btn btn-primary" on:click={newTask} aria-label="Create new task">+ New Task</button>
    <button class="btn-icon-header" on:click={onSettingsClick} title="Settings" aria-label="Open settings"><SettingsIcon size={20} /></button>
  </div>
</header>

<style>
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 0;
    border-bottom: 1px solid var(--border);
    margin-bottom: 20px;
  }
  .logo { display: flex; align-items: center; gap: 10px; }
  .logo-icon { width: 32px; height: 32px; }
  .logo-text { font-size: 22px; font-weight: 700; color: var(--purple); letter-spacing: -0.5px; }
  .task-count { font-size: 13px; color: var(--text-muted); background: var(--tag-bg); padding: 4px 12px; border-radius: 20px; }
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: var(--radius); font-size: 14px; font-weight: 500; cursor: pointer; border: none; transition: all 0.15s; }
  .btn-primary { background: var(--purple); color: #fff; }
  .btn-primary:hover { background: var(--purple-light); }
  .header-actions { display: flex; align-items: center; gap: 10px; }
  .btn-icon-header { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--text-muted); padding: 4px 8px; border-radius: var(--radius); }
  .btn-icon-header:hover { background: var(--surface-hover); color: var(--text); }
  @media (max-width: 640px) { .header { flex-direction: column; align-items: flex-start; gap: 12px; } }
</style>
