<script>
  import { toastMessage, tasks } from '../lib/stores.js';
  import { undoDelete, fetchTasks } from '../lib/api.js';

  let visible = false;
  let timeout;

  $: if ($toastMessage) {
    visible = true;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      visible = false;
      $toastMessage = null;
    }, 5000);
  }

  async function handleUndo() {
    if ($toastMessage) {
      // Handle multi-delete undo
      const ids = $toastMessage.taskIds || ($toastMessage.taskId ? [$toastMessage.taskId] : []);
      for (const id of ids) {
        await undoDelete(id);
      }
      if (ids.length > 0) {
        const refreshed = await fetchTasks({ sort: 'custom', show_completed: 'true' });
        if (refreshed) $tasks = refreshed.tasks;
      }
    }
    visible = false;
    $toastMessage = null;
    clearTimeout(timeout);
  }

  function dismiss() {
    visible = false;
    $toastMessage = null;
    clearTimeout(timeout);
  }
</script>

{#if visible && $toastMessage}
  <div class="toast" role="alert" aria-live="polite">
    <span>{$toastMessage.text}</span>
    {#if $toastMessage.taskId || ($toastMessage.taskIds && $toastMessage.taskIds.length > 0)}
      <button class="undo-btn" on:click={handleUndo}>Undo</button>
    {/if}
    <button class="dismiss-btn" on:click={dismiss} aria-label="Dismiss">&times;</button>
  </div>
{/if}

<style>
  .toast {
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: #2d2a26; color: #fff; padding: 12px 20px; border-radius: var(--radius);
    font-size: 14px; display: flex; align-items: center; gap: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 1000;
    animation: fadeIn 0.2s ease;
  }
  @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
  .undo-btn {
    background: rgba(255,255,255,0.2); border: none; color: #fff;
    padding: 4px 12px; border-radius: 4px; font-size: 13px; font-weight: 500; cursor: pointer;
  }
  .undo-btn:hover { background: rgba(255,255,255,0.3); }
  .dismiss-btn { background: none; border: none; color: rgba(255,255,255,0.6); font-size: 18px; cursor: pointer; padding: 0 4px; }
  .dismiss-btn:hover { color: #fff; }
</style>
