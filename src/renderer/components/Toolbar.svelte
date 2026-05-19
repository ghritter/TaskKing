<script>
  import { sortMode, searchQuery, activeTagFilters } from '../lib/stores.js';
  import { updateSettings } from '../lib/api.js';

  let searchInput = '';
  let searchTimeout;

  function onSearchInput() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      $searchQuery = searchInput;
    }, 300);
  }

  function removeFilter(tag) {
    $activeTagFilters = $activeTagFilters.filter(t => t !== tag);
  }

  function onSortChange(e) {
    $sortMode = e.target.value;
    updateSettings({ sort_preference: e.target.value });
  }
</script>

<div class="toolbar">
  <div class="search-box">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
    <input
      type="text"
      placeholder="Search tasks or filter by tag..."
      bind:value={searchInput}
      on:input={onSearchInput}
      aria-label="Search tasks"
    >
  </div>

  <select class="sort-select" value={$sortMode} on:change={onSortChange} aria-label="Sort tasks by">
    <option value="custom">Custom Order</option>
    <option value="priority">Priority</option>
    <option value="due">Due Date</option>
    <option value="created">Created Date</option>
    <option value="edited">Last Edited</option>
    <option value="alpha">Alphabetical</option>
  </select>
</div>

{#if $activeTagFilters.length > 0}
  <div class="active-filters">
    <span class="filter-label">Filtered by:</span>
    {#each $activeTagFilters as tag}
      <button class="filter-chip" on:click={() => removeFilter(tag)} aria-label="Remove filter: {tag}">
        {tag} <span class="remove">&times;</span>
      </button>
    {/each}
  </div>
{/if}

<style>
  .toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
  .search-box {
    display: flex; align-items: center; background: var(--surface);
    border: 1px solid var(--border); border-radius: var(--radius);
    padding: 8px 14px; flex: 1; min-width: 200px; max-width: 320px; box-shadow: var(--shadow);
  }
  .search-box svg { width: 16px; height: 16px; color: var(--text-muted); margin-right: 8px; flex-shrink: 0; }
  .search-box input { background: none; border: none; color: var(--text); font-size: 14px; width: 100%; outline: none; }
  .search-box input::placeholder { color: var(--text-muted); }
  .sort-select {
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
    color: var(--text); font-size: 13px; padding: 8px 14px; cursor: pointer; outline: none; box-shadow: var(--shadow);
  }
  .active-filters { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
  .filter-label { font-size: 12px; color: var(--text-muted); font-weight: 500; }
  .filter-chip {
    display: inline-flex; align-items: center; gap: 4px; background: var(--purple);
    color: #fff; font-size: 12px; padding: 3px 10px; border-radius: 12px; font-weight: 500;
    cursor: pointer; border: none;
  }
  .filter-chip .remove { opacity: 0.7; font-size: 14px; }
  .filter-chip:hover .remove { opacity: 1; }
  @media (max-width: 640px) {
    .toolbar { flex-direction: column; align-items: stretch; }
    .search-box { max-width: none; }
  }
</style>
