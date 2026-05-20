<script>
  import { Crown } from 'lucide-svelte';
  export let label = '';
  export let checked = false;
  export let variant = 'default';
</script>

<div class="toggle-wrapper" class:king={variant === 'king'}>
  <label class="toggle">
    <input type="checkbox" bind:checked aria-label={label}>
    <span class="toggle-slider"></span>
  </label>
  <span class="toggle-label">
    {#if variant === 'king'}<Crown size={16} color="var(--gold)" />{/if}
    {label}
  </span>
</div>

<style>
  .toggle-wrapper { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-muted); white-space: nowrap; }
  .toggle { position: relative; width: 36px; height: 20px; cursor: pointer; display: inline-block; }
  .toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
  .toggle-slider { position: absolute; inset: 0; background: var(--border); border-radius: 20px; transition: background 0.2s; }
  .toggle-slider::before {
    content: ''; position: absolute; width: 16px; height: 16px; left: 2px; top: 2px;
    background: #fff; border-radius: 50%; transition: transform 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.15);
  }
  .toggle input:checked + .toggle-slider { background: var(--purple); }
  .toggle input:checked + .toggle-slider::before { transform: translateX(16px); }
  .king .toggle input:checked + .toggle-slider { background: var(--gold); }
  .toggle-label { cursor: default; display: inline-flex; align-items: center; gap: 4px; }
</style>
