<script>
  import { onMount } from 'svelte';

  export let visible = false;
  export let onClose = () => {};

  let apiKey = '';
  let showKey = false;
  let copied = false;
  let port = 7878;

  onMount(async () => {
    if (window.taskking) {
      apiKey = await window.taskking.getApiKey();
      port = await window.taskking.getPort();
    }
  });

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

  function handleKeydown(e) {
    if (e.key === 'Escape') onClose();
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

      <div class="section">
        <h3>API Access</h3>
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
      </div>

      <div class="section">
        <h3>Usage Example</h3>
        <pre class="code-block">curl -X POST http://127.0.0.1:{port}/api/tasks \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{JSON.stringify({name: "New task", priority: 2, tags: ["example"]})}'</pre>
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
  .section { margin-bottom: 28px; }
  .section h3 { font-size: 14px; font-weight: 600; margin-bottom: 6px; color: var(--text); }
  .section-desc { font-size: 13px; color: var(--text-muted); margin-bottom: 16px; }
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
  @media (max-width: 640px) { .panel { width: 100%; } }
</style>
