const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { initDb } = require('./db');
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
}

// IPC handlers
ipcMain.handle('get-api-key', () => getApiKey());
ipcMain.handle('get-port', () => API_PORT);
ipcMain.handle('regenerate-api-key', () => regenerateApiKey());

app.whenReady().then(async () => {
  // Initialize database
  await initDb();

  // Initialize auth (generate API key if first run)
  initAuth();

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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
