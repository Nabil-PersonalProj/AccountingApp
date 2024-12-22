const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { addCompany, getCompanies, getTransactions, getAccounts, searchTransaction } = require('./database/database');

const isMac = process.platform == 'darwin';
const isDev = process.env.NODE_ENV != 'development';

// main window
function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Open devtools if in dev
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  
  mainWindow.loadFile(path.join(__dirname, 'windows', 'mainWindowcard.html'));
}

// Create company window
function createCompanyWindow(companyId) {
  const companyWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  companyWindow.loadFile(path.join(__dirname, 'windows', 'companyWindow.html'));

  // Send company id to renderer process
  companyWindow.webContents.once('did-finish-load', () => {
    companyWindow.webContents.send('load-transactions', companyId);
  });
}

// Register IPC Handlers
ipcMain.handle('get-companies', async () => {
  try {
    return await getCompanies();
  } catch (error) {
    console.error('Error in handler for get-companies:', error);
    throw error;
  }
});

ipcMain.handle('add-company', async (event, name) => {
  try {
    return await addCompany(name);
  } catch (error) {
    console.error('Error in handler for add-company:', error);
    throw error;
  }
});

ipcMain.handle('open-company-window', async (event,companyId) => {
  try {
    createCompanyWindow(companyId);
  } catch (error) {
    console.error('Error opening company window:', error);
    throw error;
  }
});

// Fetch the name of a specific company by ID
ipcMain.handle('get-company-name', async (event, companyId) => {
  try {
    const companies = await getCompanies();
    const company = companies.find(c => c.id === companyId);
    if (!company) throw new Error(`Company with ID ${companyId} not found`);
    return company.name;
  } catch (error) {
    console.error(`Error fetching company name for ID ${companyId}:`, error);
    throw error;
  }
});

ipcMain.handle('get-transactions', async (event, companyId) => {
  try {
    const transactions = await getTransactions(companyId);
    return transactions || []; // Return an empty array if no transactions exist
  } catch (error) {
    console.error(`Error fetching transactions for company ID ${companyId}:`, error);
    throw error;
  }
});

ipcMain.handle('get-accounts', async (event, companyId) => {
  try {
    return await getAccounts(companyId); // Function to fetch accounts
  } catch (error) {
    console.error('Error fetching accounts:', error);
    throw error;
  }
});

ipcMain.handle('get-last-transaction', async (event, companyId) => {
  try {
    return await getLastTransaction(companyId);
  } catch (error) {
    console.error('Error fetching last transaction:', error);
    throw error;
  }
});

ipcMain.handle('search-transaction', async (event, companyId, query) => {
  try {
    return await searchTransaction(companyId, query);
  } catch (error) {
    console.error('Error searching transaction:' , error);
    throw error;
  }
});


// starting the app
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