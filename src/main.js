const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const { addCompany, getCompanies, deleteCompany,
  getTransactions, getAccounts, searchTransaction, 
  addTransaction, updateTransactions, deleteTransactions, getLastTransaction, 
  addAccount, deleteAccount, updateAccounts,
 } = require('./database/database');

const isMac = process.platform == 'darwin';
const isDev = process.env.NODE_ENV != 'development';

//let mainWindow

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
let companyWindows = {};

function createCompanyWindow(companyId) {
  if (!companyWindows[companyId]) {
    companyWindows[companyId] = []; // Initialize array if not exists
  }

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

  companyWindows[companyId].push(companyWindow);

  // Send company id to renderer process
  companyWindow.webContents.once('did-finish-load', () => {
    companyWindow.webContents.send('load-transactions', companyId);
  });

  console.log('company window loaded. Id:', companyId);
}

function createProfitLossWindow(companyId) {
  const profitLossWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  profitLossWindow.loadFile(path.join(__dirname, 'windows', 'profitLossWindow.html'));

  profitLossWindow.webContents.on('did-finish-load', () => {
    profitLossWindow.webContents.send('load-profit-loss', companyId);
  });

  console.log('Profit & Loss window opened for Company ID:', companyId);
}

function addTransactionWindow(companyId) {
  const addTransactionWindow = new BrowserWindow({
    width: 1000,
    height: 500,
    modal: true,
    parent: BrowserWindow.getFocusedWindow(),
    webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(__dirname, 'preload.js')
    }
  });

  addTransactionWindow.loadFile(path.join(__dirname, 'windows', 'addTransactionWindow.html'));

  addTransactionWindow.webContents.once('did-finish-load', () => {
    addTransactionWindow.webContents.send('initialize-add-transaction', companyId);
});

console.log('Add Transaction window opened for Company ID:', companyId);
}

function createEditTransactionWindow(companyId, transactionNo) {
  const editTransactionWindow = new BrowserWindow({
      width: 1000,
      height: 600,
      modal: true,
      parent: BrowserWindow.getFocusedWindow(),
      webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          preload: path.join(__dirname, 'preload.js')
      }
  });

  editTransactionWindow.loadFile(path.join(__dirname, 'windows', 'editTransactionWindow.html'));

  editTransactionWindow.webContents.once('did-finish-load', () => {
    console.log("Sending 'initialize-edit-transaction' event with:", companyId, transactionNo);
      editTransactionWindow.webContents.send('initialize-edit-transaction', companyId, transactionNo);
  });

  console.log('Edit Transaction window opened for Company ID:', companyId, 'Transaction No:', transactionNo);
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

ipcMain.handle('delete-company', async (event, companyId) => {
  try {
    return await deleteCompany(companyId);
  } catch(error) {
    console.error('Error deleting company:', error);
    throw error;
  }
})

ipcMain.handle('add-account', async (event, companyId, accountCode, accountName, accountType) => {
  try {
    console.log('accountCode:',accountCode)
    return await addAccount(companyId, accountCode, accountName, accountType);
  } catch (error) {
    console.error('Error adding account: ', error);
    return { success: false, message: error.message};
  }
})

function getActiveCompanyWindow() {
  return BrowserWindow.getFocusedWindow(); // Returns the currently focused window
}

ipcMain.handle('update-accounts', async (event, companyId, accounts) => {
  try {
      return await updateAccounts(companyId, accounts);
  } catch (error) {
      console.error('Error updating accounts:', error);
      throw error;
  }
});

ipcMain.handle('delete-account', async (event, companyId, accountCode) => {
  try {
      return await deleteAccount(companyId, accountCode);
  } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
  }
});

ipcMain.handle('get-active-company-id', (event) => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) return null;

  // Search all companyWindows to find which one it is
  for (const companyId in companyWindows) {
    if (companyWindows[companyId].includes(focusedWindow)) {
      return parseInt(companyId);
    }
  }

  return null;
});

// Handle IPC request to open Profit & Loss window
ipcMain.on('fetch-company-id', (event, companyId) => {
  createProfitLossWindow(companyId);
});

ipcMain.on('open-add-transaction-window', (event, companyId) => {
  addTransactionWindow(companyId);
});

ipcMain.on('open-edit-transaction-window', (event, companyId, transactionNo) => {
  console.log("Received request to open Edit Transaction Window for:", companyId, "Transaction No:", transactionNo);
  createEditTransactionWindow(companyId, transactionNo);
});

ipcMain.on('refresh-page', (event, companyId) => {
  console.log("Refreshing all windows for company ID:", companyId);

  if (companyWindows[companyId]) {
      companyWindows[companyId].forEach(win => {
          if (!win.isDestroyed()) {
              win.webContents.send('refresh-transactions', companyId);
          }
      });
  } else {
      console.error("No open windows found for company ID:", companyId);
  }
});

ipcMain.on('export-profit-loss-csv', async (event, report) => {
  try {
      if (!report) {
          dialog.showMessageBoxSync({ type: 'error', message: 'No data to export!' });
          return;
      }

      const csvData = generatePLCSV(report);
      const filePath = await showSaveDialog('ProfitLossReport.csv');

      if (filePath) {
          fs.writeFileSync(filePath, csvData);
          dialog.showMessageBoxSync({ type: 'info', message: 'Export successful!' });
      }
  } catch (error) {
      console.error('Error exporting Profit & Loss CSV:', error);
      dialog.showMessageBoxSync({ type: 'error', message: 'Export failed.' });
  }
});

function generatePLCSV(report) {
  const headers = ['Account Code', 'Account Name', 'Category', 'Total Debit', 'Total Credit'];
  const rows = [];

  function addSection(title, accounts) {
      rows.push([title, '', '', '', '']); // Section header
      accounts.forEach(account => {
          rows.push([account.account_code, account.account_name, account.account_type, account.totalDebit, account.totalCredit]);
      });
  }

  addSection('Sales', report.sales);
  addSection('Cost of Sales', report.costOfSales);
  rows.push(['Gross Profit', '', '', '', report.totals.grossProfit]); // Add gross profit row
  addSection('Expenses', report.expenses);
  rows.push(['Final Profit', '', '', '', report.totals.finalProfit]); // Add final profit row
  addSection('Profit & Loss (Brought Forward)', report.profitLoss);
  rows.push(['P&L Carried Forward', '', '', '', report.totals.plCarriedForward]); // Add P&L carried forward

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

// Function to open Save File Dialog
async function showSaveDialog(defaultFileName) {
  const { filePath } = await dialog.showSaveDialog({
      title: 'Save CSV File',
      defaultPath: defaultFileName,
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
  });

  return filePath;
}

// Menu
const menuTemplate = [
  {
    label: 'File',
    submenu: [
      {
        label: 'New Company',
      },
      {
        label: 'Open',
      },
      { type: 'separator' },
      { role: 'quit' } // Standard quit function
    ]
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' }
    ]
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
      {
        label: 'Profit/Loss',
        click: () => {
          const focusedWindow = BrowserWindow.getFocusedWindow();
          if (focusedWindow) {
            focusedWindow.webContents.send('request-company-id');
          } else {
            console.error("No active window detected.");
          }
        }
      },
    ]
  },
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'close' }
    ]
  },
  {
    label: 'Export',
    submenu: [
      {
        label: 'Profit/Loss Report',
        click: () => {
          const focusedWindow = BrowserWindow.getFocusedWindow();
          if (focusedWindow) {
            focusedWindow.webContents.send('request-export-profit-loss');
          }
        },
      },
      {
        label: 'Trial Balance',
        click: () => {

        },
      },
      {
        label: 'Transations',
        click: () => {

        }
      },
    ]
  },
  {
    label: 'Tools',
    submenu: [
      {
        label: 'Add Transaction',
        accelerator: 'Ctrl+N',
        click: () => {
          const companyWindow = getActiveCompanyWindow();
          if (companyWindow) {
            companyWindow.webContents.send('open-add-transaction');
          }
        }
      },
      {
        label: 'Edit Transaction',
        accelerator: 'Ctrl+E',
        click: () => {
          const companyWindow = getActiveCompanyWindow();
          if (companyWindow) {
            companyWindow.webContents.send('open-edit-transaction');
          }
        }
      },
      {
        label: 'Account Manager',
        click: () => {
          const companyWindow = getActiveCompanyWindow();
          if (companyWindow) {
            companyWindow.webContents.send('open-add-account')
          }
        }
      }
    ]
  }
];


// starting the app
app.whenReady().then(() => {
  createMainWindow();

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

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