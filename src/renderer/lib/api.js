let apiKey = null;
let apiPort = 7878;
let initialized = false;

async function init() {
  if (initialized) return;
  
  // Wait briefly for preload to be available
  for (let i = 0; i < 10; i++) {
    if (window.taskking) break;
    await new Promise(r => setTimeout(r, 100));
  }

  if (window.taskking) {
    apiKey = await window.taskking.getApiKey();
    apiPort = await window.taskking.getPort();
  } else {
    // Dev fallback: try to read from localStorage or use default port
    apiPort = 7878;
    console.warn('TaskKing preload not available. API calls may fail without auth.');
  }
  initialized = true;
}

function getBaseUrl() {
  return `http://127.0.0.1:${apiPort}`;
}

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  return headers;
}

async function ensureInit() {
  if (!initialized) await init();
}

export async function fetchTasks(params = {}) {
  await ensureInit();
  const url = new URL(`${getBaseUrl()}/api/tasks`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        for (const v of value) url.searchParams.append(key, v);
      } else {
        url.searchParams.set(key, value);
      }
    }
  }
  try {
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) { console.error('fetchTasks failed:', res.status, await res.text()); return null; }
    return await res.json();
  } catch (e) {
    console.error('Failed to fetch tasks:', e);
    return null;
  }
}

export async function fetchTask(id) {
  await ensureInit();
  try {
    const res = await fetch(`${getBaseUrl()}/api/tasks/${id}`, { headers: getHeaders() });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('Failed to fetch task:', e);
    return null;
  }
}

export async function createTask(data) {
  await ensureInit();
  try {
    const res = await fetch(`${getBaseUrl()}/api/tasks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) { console.error('createTask failed:', res.status, await res.text()); return null; }
    return await res.json();
  } catch (e) {
    console.error('Failed to create task:', e);
    return null;
  }
}

export async function updateTask(id, data) {
  await ensureInit();
  try {
    const res = await fetch(`${getBaseUrl()}/api/tasks/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('Failed to update task:', e);
    return null;
  }
}

export async function deleteTask(id) {
  await ensureInit();
  try {
    const res = await fetch(`${getBaseUrl()}/api/tasks/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('Failed to delete task:', e);
    return null;
  }
}

export async function undoDelete(id) {
  await ensureInit();
  try {
    const res = await fetch(`${getBaseUrl()}/api/tasks/${id}/undo-delete`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('Failed to undo delete:', e);
    return null;
  }
}

export async function toggleComplete(id) {
  await ensureInit();
  try {
    const res = await fetch(`${getBaseUrl()}/api/tasks/${id}/complete`, {
      method: 'PATCH',
      headers: getHeaders()
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('Failed to toggle complete:', e);
    return null;
  }
}

export async function popToTop(id) {
  await ensureInit();
  try {
    const res = await fetch(`${getBaseUrl()}/api/tasks/${id}/pop-to-top`, {
      method: 'PATCH',
      headers: getHeaders()
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('Failed to pop to top:', e);
    return null;
  }
}

export async function reorderTasks(order) {
  await ensureInit();
  try {
    const res = await fetch(`${getBaseUrl()}/api/tasks/reorder`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ order })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('Failed to reorder tasks:', e);
    return null;
  }
}

export async function fetchSettings() {
  await ensureInit();
  try {
    const res = await fetch(`${getBaseUrl()}/api/settings`, { headers: getHeaders() });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('Failed to fetch settings:', e);
    return null;
  }
}

export async function updateSettings(data) {
  await ensureInit();
  try {
    const res = await fetch(`${getBaseUrl()}/api/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('Failed to update settings:', e);
    return null;
  }
}
