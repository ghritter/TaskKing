import { writable } from 'svelte/store';

export const tasks = writable([]);
export const sortMode = writable('custom');
export const searchQuery = writable('');
export const activeTagFilters = writable([]);
export const showCompleted = writable(true);
export const showDueDates = writable(true);
export const isKingView = writable(false);
export const editingTask = writable(null);
export const toastMessage = writable(null);
