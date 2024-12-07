const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { addCompany, getCompanies } = require('./database/database');

const isMac = process.platform == 'darwin';
const isDev = process.env.NODE_ENV != 'development';

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  // Open devtools if in dev
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  
  mainWindow.loadFile(path.join(__dirname, 'windows', 'mainWindow.html'));
}


app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
}); 

app.on('window-all-closed', () => {
  if (isMac) {
    app.quit()
  }
})