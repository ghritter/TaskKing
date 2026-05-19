const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('taskking', {
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  getPort: () => ipcRenderer.invoke('get-port'),
  regenerateApiKey: () => ipcRenderer.invoke('regenerate-api-key'),
  getPlatform: () => process.platform
});
