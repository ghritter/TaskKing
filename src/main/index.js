const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { initDb, getDb, saveDb } = require('./db');
const { startApi } = require('./api');
const { getApiKey, regenerateApiKey, initAuth } = require('./auth');

const isDev = !app.isPackaged;
const API_PORT = 7878;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 400,
    minHeight: 500,
    title: 'TaskKing',
    icon: path.join(__dirname, '..', 'renderer', 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    }
  });

  if (isDev) {
    // Wait for Vite dev server to be ready before loading
    const devUrl = 'http://localhost:5173';
    const waitForVite = () => {
      require('http').get(devUrl, () => {
        mainWindow.loadURL(devUrl);
      }).on('error', () => {
        setTimeout(waitForVite, 500);
      });
    };
    waitForVite();
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', '..', 'build', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      if (!url.startsWith('http://localhost:')) {
        event.preventDefault();
        shell.openExternal(url);
      }
    }
  });
}

// IPC handlers
ipcMain.handle('get-api-key', () => getApiKey());
ipcMain.handle('get-port', () => API_PORT);
ipcMain.handle('get-version', () => require('../../package.json').version);
ipcMain.handle('regenerate-api-key', () => regenerateApiKey());

app.whenReady().then(async () => {
  // Initialize database
  await initDb();

  // Initialize auth (generate API key if first run)
  initAuth();

  // Purge tasks deleted more than 30 days ago
  purgeOldDeletedTasks();

  // Start Express API server
  startApi(API_PORT);

  // Create the window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

function purgeOldDeletedTasks() {
  const db = getDb();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  // Delete tags for old deleted tasks
  db.run("DELETE FROM task_tags WHERE task_id IN (SELECT id FROM tasks WHERE deleted = 1 AND deleted_at < ?)", [thirtyDaysAgo]);
  // Delete the tasks themselves
  db.run("DELETE FROM tasks WHERE deleted = 1 AND deleted_at < ?", [thirtyDaysAgo]);
  saveDb();
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
