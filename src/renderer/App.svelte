<script>
  import { onMount } from 'svelte';
  import { tasks, sortMode, searchQuery, activeTagFilters, showCompleted, showDueDates, isKingView, editingTask, toastMessage } from './lib/stores.js';
  import { fetchTasks, fetchSettings } from './lib/api.js';
  import Header from './components/Header.svelte';
  import Toolbar from './components/Toolbar.svelte';
  import Toggle from './components/Toggle.svelte';
  import TaskList from './components/TaskList.svelte';
  import KingView from './components/KingView.svelte';
  import TaskDetail from './components/TaskDetail.svelte';
  import Toast from './components/Toast.svelte';
  import Settings from './components/Settings.svelte';

  let showSettings = false;

  onMount(async () => {
    // Load settings
    const settings = await fetchSettings();
    if (settings) {
      $sortMode = settings.sort_preference || 'custom';
      $showCompleted = settings.show_completed !== false;
      $showDueDates = settings.show_due_dates !== false;
    }

    // Load tasks
    await loadTasks();
  });

  async function loadTasks() {
    const params = {
      sort: $sortMode,
      show_completed: String($showCompleted),
      search: $searchQuery || undefined,
      tag: $activeTagFilters.length > 0 ? $activeTagFilters : undefined
    };
    const result = await fetchTasks(params);
    if (result) {
      $tasks = result.tasks;
    }
  }

  // Reload tasks when filters change
  $: if ($sortMode || $showCompleted !== undefined || $searchQuery !== undefined || $activeTagFilters) {
    loadTasks();
  }
</script>

<div class="app-container" role="main" aria-label="TaskKing application">
  <Header onSettingsClick={() => showSettings = true} />
  <Toolbar />

  <div class="toggles-row">
    <Toggle label="Show completed" bind:checked={$showCompleted} />
    <Toggle label="Show due dates" bind:checked={$showDueDates} />
    <Toggle label="👑 King Task" bind:checked={$isKingView} variant="king" />
  </div>

  {#if $isKingView}
    <KingView />
  {:else}
    <TaskList />
  {/if}

  {#if $editingTask !== null}
    <TaskDetail />
  {/if}

  <Toast />
  <Settings visible={showSettings} onClose={() => showSettings = false} />
</div>

<style>
  .app-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 0 20px;
  }

  .toggles-row {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  @media (max-width: 640px) {
    .app-container {
      padding: 0 16px;
    }
    .toggles-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
  }
</style>
