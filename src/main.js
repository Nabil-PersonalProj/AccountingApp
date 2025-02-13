const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { addCompany, getCompanies, getTransactions, getAccounts, searchTransaction, addTransaction, updateTransactions, deleteTransactions, getLastTransaction } = require('./database/database');

const isMac = process.platform == 'darwin';
const isDev = process.env.NODE_ENV != 'development';

// main window
function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Open devtools if in dev
  
  
  mainWindow.loadFile(path.join(__dirname, 'windows', 'mainWindowcard.html'));
  console.log('main window loaded');
}

// Create company window
function createCompanyWindow(companyId) {

  const companyWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  companyWindow.maximize();

  companyWindow.loadFile(path.join(__dirname, 'windows', 'companyWindow.html'));

  // Send company id to renderer process
  companyWindow.webContents.once('did-finish-load', () => {
    companyWindow.webContents.send('load-transactions', companyId);
  });

  console.log('company window loaded. Id:', companyId);
}

// Register IPC Handlers
ipcMain.handle('show-message', async (event, message, title) => {
  await dialog.showMessageBox({
    type: 'info',
    title: title,
    message: message,
    buttons: ['OK']
  });
});

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
    return { success: true, message: await addCompany(name) };
  } catch (error) {
    console.error('Error adding company:', error);
    return { success: false, message: error.message };
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
  console.log(`Searching for transactions in company ${companyId} with query: ${query}`);
  try {
    return await searchTransaction(companyId, query);
  } catch (error) {
    console.error('Error searching transaction:' , error);
    throw error;
  }
});

ipcMain.handle('add-transaction', async (event, companyId, transaction) => {
  try {
    console.log('Transaction Received in Main Process:', transaction);

    // Ensure transaction is wrapped in an array
    const transactionsArray = Array.isArray(transaction) ? transaction : [transaction];

    const result = await addTransaction(companyId, transactionsArray);
    console.log('Transaction inserted: ', result)
    return result;
  } catch (error) {
    console.log(error)
    console.error('Error adding transaction:', error);
    throw error;
  }
});

ipcMain.handle('update-transactions', async (event, companyId, transactions) => {
  try {
    console.log,('Transactions to be updated: ', transactions)
    return await updateTransactions(companyId, transactions);
  } catch (error) {
    console.error('Error updating transactions:', error);
    throw error;
  }
});

ipcMain.handle('delete-transactions', async (event, companyId, transactionIds) => {
  try {
    return await deleteTransactions(companyId, transactionIds);
  } catch (error) {
    console.error('Error deleting transactions:', error);
    throw error;
  }
});


// starting the app
app.whenReady().then(() => {
  createMainWindow();
  console.log('App is ready')

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