const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const { addCompany, getCompanies, deleteCompany,
  getTransactions, getAccounts, searchTransaction, 
  addTransaction, updateTransactions, deleteTransactions, getLastTransaction, 
  addAccount, deleteAccount, updateAccounts,
 } = require('./database/database');
 const fs = require('fs');
const log = require('./logger');

const isMac = process.platform == 'darwin';
const isDev = process.env.NODE_ENV != 'development';

let carryForwardSourceCompanyId = null;

//let mainWindow

// main window
function createMainWindow() {
  log.info('[Main] createMainWindow()');
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  
  
  mainWindow.loadFile(path.join(__dirname, 'windows', 'mainWindowcard.html'));
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

  log.info(`[Main] createCompanyWindow(${companyId})`);
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
  log.info(`[Main] createProfitLossWindow(${companyId})`);
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

log.info('[Main] Add Transaction window opened for Company ID:', companyId);
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
    log.info("Sending 'initialize-edit-transaction' event with:", companyId, transactionNo);
      editTransactionWindow.webContents.send('initialize-edit-transaction', companyId, transactionNo);
  });

  log.info('[Main] Edit Transaction window opened for Company ID:', companyId, 'Transaction No:', transactionNo);
}

function createAddCompanyWindow() {
  const addWindow = new BrowserWindow({
    width: 500,
    height: 300,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  addWindow.loadFile(path.join(__dirname, 'windows', 'addCompanyWindow.html'));
  log.info('[Main] Add Company window opened');
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
    log.info(`[Main][IPC] get-companies `);
    return await getCompanies();
  } catch (error) {
    log.error('[Main][IPC] Error in handler for get-companies:', error);
    throw error;
  }
});

ipcMain.handle('add-company', async (event, name, carryForwardFromId = null) => {
  try {
    log.info(`[Main][IPC] add-companies (${name}) from (${carryForwardFromId})`);
    const companiesBefore = await getCompanies();
    const addResult = await addCompany(name);
    const companiesAfter = await getCompanies();

    // Determine the new company ID by diffing
    const newCompany = companiesAfter.find(c => !companiesBefore.some(cb => cb.id === c.id));
    const newCompanyId = newCompany?.id;

    if (carryForwardFromId) {
      log.info('[Main] Starting the next part of carryForward')
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('carry-forward-after-company-created', newCompanyId, carryForwardFromId);
      });
    }
    // Send refresh-companies to all renderer processes (or target mainWindow specifically if you track it)
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('refresh-companies');
    });

    return {
      success: true,
      message: addResult,
      newCompanyId: newCompanyId,
    };
  } catch (error) {
    log.error('[Main][IPC] Error adding company:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('open-company-window', async (event,companyId) => {
  try {
    log.info(`[Main][IPC] open-company-window (${companyId})`);
    createCompanyWindow(companyId);
  } catch (error) {
    log.error('[Main][IPC] Error opening company window:', error);
    throw error;
  }
});

// Fetch the name of a specific company by ID
ipcMain.handle('get-company-name', async (event, companyId) => {
  try {
    log.info(`[Main][IPC] get-company-name (${companyId})`);
    const companies = await getCompanies();
    const company = companies.find(c => c.id === companyId);
    if (!company) throw new Error(`Company with ID ${companyId} not found`);
    return company.name;
  } catch (error) {
    log.error(`[Main][IPC] Error fetching company name for ID ${companyId}:`, error);
    throw error;
  }
});

ipcMain.handle('get-transactions', async (event, companyId) => {
  try {
    log.info(`[Main][IPC] get-company-name (${companyId})`);
    const transactions = await getTransactions(companyId);
    return transactions || []; // Return an empty array if no transactions exist
  } catch (error) {
    log.error(`[Main][IPC] Error fetching transactions for company ID ${companyId}:`, error);
    throw error;
  }
});

ipcMain.handle('get-accounts', async (event, companyId) => {
  try {
    log.info(`[Main][IPC] get-accounts for (${companyId})`);
    return await getAccounts(companyId); // Function to fetch accounts
  } catch (error) {
    log.error('[Main][IPC] Error fetching accounts:', error);
    throw error;
  }
});

ipcMain.handle('get-last-transaction', async (event, companyId) => {
  try {
    log.info(`[Main][IPC] get-last-transaction for (${companyId})`);
    return await getLastTransaction(companyId);
  } catch (error) {
    log.error('[Main][IPC] Error fetching last transaction:', error);
    throw error;
  }
});

ipcMain.handle('search-transaction', async (event, companyId, query) => {
  log.info(`[Main][IPC] Searching for transactions in company ${companyId} with query: ${query}`);
  try {
    return await searchTransaction(companyId, query);
  } catch (error) {
    log.error('[Main][IPC] Error searching transaction:' , error);
    throw error;
  }
});

ipcMain.handle('add-transaction', async (event, companyId, transaction) => {
  try {
    log.info('[Main][IPC] Transaction Received in Main Process:', transaction);

    // Ensure transaction is wrapped in an array
    const transactionsArray = Array.isArray(transaction) ? transaction : [transaction];

    const result = await addTransaction(companyId, transactionsArray);
    log.info('[Main][IPC] Transaction inserted: ', result)
    return result;
  } catch (error) {
    log.error('[Main][IPC] Error adding transaction:', error);
    throw error;
  }
});

ipcMain.handle('update-transactions', async (event, companyId, transactions) => {
  try {
    log.info('[Main][IPC] Transactions to be updated: ', transactions)
    return await updateTransactions(companyId, transactions);
  } catch (error) {
    log.error('[Main][IPC] Error updating transactions:', error);
    throw error;
  }
});

ipcMain.handle('delete-transactions', async (event, companyId, transactionIds) => {
  try {
    log.info(`[Main][IPC] delete-transactions for ${companyId}`, transactions);
    return await deleteTransactions(companyId, transactionIds);
  } catch (error) {
    log.error('[Main][IPC] Error deleting transactions:', error);
    throw error;
  }
});

ipcMain.handle('delete-company', async (event, companyId) => {
  try {
    log.info(`[Main][IPC] delete-company ${companyId}`);
    return await deleteCompany(companyId);
  } catch(error) {
    log.error('[Main][IPC] Error deleting company:', error);
    throw error;
  }
})

ipcMain.handle('add-account', async (event, companyId, accountCode, accountName, accountType) => {
  try {
    log.info('[Main][IPC] accountCode:',accountCode);
    return await addAccount(companyId, accountCode, accountName, accountType);
  } catch (error) {
    log.error('[Main][IPC] Error adding account: ', error);
    return { success: false, message: error.message};
  }
})

function getActiveCompanyWindow() {
  return BrowserWindow.getFocusedWindow(); // Returns the currently focused window
}

ipcMain.handle('update-accounts', async (event, companyId, accounts) => {
  try {
    log.info('[Main][IPC] update account: ', accounts);
    return await updateAccounts(companyId, accounts);
  } catch (error) {
    log.error('[Main][IPC] Error updating accounts:', error);
    throw error;
  }
});

ipcMain.handle('delete-account', async (event, companyId, accountCode) => {
  try {
    log.info('[Main][IPC] delete account: ', accountCode)
    return await deleteAccount(companyId, accountCode);
  } catch (error) {
    log.error('[Main][IPC] Error deleting account:', error);
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

ipcMain.handle('get-profit-loss-summary', async (event, companyId) => {
  const accounts = await getAccounts(companyId);
  const transactions = await getTransactions(companyId);

  const allAccounts = accounts.map(account => {
    const tx = transactions.filter(t => t.account_code === account.account_code);
    const totalDebit = tx.reduce((sum, t) => sum + (t.debit || 0), 0);
    const totalCredit = tx.reduce((sum, t) => sum + (t.credit || 0), 0);
    const reBalance = totalCredit - totalDebit;

    return {
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
      totalDebit: reBalance > 0 ? 0 : reBalance,
      totalCredit: reBalance > 0 ? reBalance : 0
    };
  });

  const report = {
    sales: [],
    costOfSales: [],
    expenses: [],
    profitLoss: [],
    totals: { sales: 0, costOfSales: 0, expenses: 0, profitLoss: 0 }
  };

  allAccounts.forEach(account => {
    switch (account.account_type) {
      case 'Sales':
        report.sales.push(account);
        report.totals.sales += account.totalCredit + account.totalDebit;
        break;
      case 'Cost of Sale':
        report.costOfSales.push(account);
        report.totals.costOfSales += account.totalCredit + account.totalDebit;
        break;
      case 'Expense':
        report.expenses.push(account);
        report.totals.expenses += account.totalCredit + account.totalDebit;
        break;
      case 'Profit & Loss':
        report.profitLoss.push(account);
        report.totals.profitLoss += account.totalCredit + account.totalDebit;
        break;
    }
  });

  report.totals.grossProfit = report.totals.sales + report.totals.costOfSales;
  report.totals.finalProfit = report.totals.grossProfit + report.totals.expenses;
  report.totals.plCarriedForward = report.totals.finalProfit + report.totals.profitLoss;

  log.info('[Main][IPC] profit loss sumarry generated');

  return report;
});

ipcMain.handle('get-carry-forward-source', () => carryForwardSourceCompanyId);

ipcMain.on('set-carry-forward-source', (_, sourceId) => {
  carryForwardSourceCompanyId = sourceId;
});

// Handle IPC request to open Profit & Loss window
ipcMain.on('fetch-company-id', (event, companyId) => {
  log.info('[Main][IPC] profitlossWin');
  createProfitLossWindow(companyId);
});

ipcMain.on('open-add-transaction-window', (event, companyId) => {
  log.info('[Main][IPC] addtransactionWin');
  addTransactionWindow(companyId);
});

ipcMain.on('open-add-company-window', () => {
  log.info('[Main][IPC] addCompanyWin');
  createAddCompanyWindow();
});


ipcMain.on('open-edit-transaction-window', (event, companyId, transactionNo) => {
  log.info("[Main][IPC] Received request to open Edit Transaction Window for:", companyId, "Transaction No:", transactionNo);
  createEditTransactionWindow(companyId, transactionNo);
});

// logs
ipcMain.on('log-info', (_, msg) => {
  console.log(`[Renderer] ${msg}`);
  log.info(`[Renderer] ${msg}`);   
});
ipcMain.on('log-warn', (_, msg) => {
  console.warn(`[Renderer] ${msg}`);
  log.warn(`[Renderer] ${msg}`);
});
ipcMain.on('log-error', (_, msg) => {
  console.error(`[Renderer] ${msg}`);
  log.error(`[Renderer] ${msg}`);
});

ipcMain.on('refresh-page', (event, companyId) => {
  log.info("[Main][IPC] Refreshing all windows for company ID:", companyId);

  if (companyWindows[companyId]) {
      companyWindows[companyId].forEach(win => {
          if (!win.isDestroyed()) {
              win.webContents.send('refresh-transactions', companyId);
          }
      });
  } else {
      log.error("[Main][IPC] No open windows found for company ID:", companyId);
  }
});

ipcMain.on('export-trial-balance-csv', async (event, report) => {
  try {
      const csvData = generateTrialBalanceCSV(report);
      const filePath = await showSaveDialog('TrialBalance.csv');
      if (filePath) {
          fs.writeFileSync(filePath, csvData);
          log.info('[Main][IPC] export-trial-balance-csv');
          dialog.showMessageBoxSync({ type: 'info', message: 'Export successful!' });
      }
  } catch (error) {
      log.error('[Main][IPC] Error exporting Trial Balance CSV:', error);
      dialog.showMessageBoxSync({ type: 'error', message: 'Export failed.' });
  }
});

function generateTrialBalanceCSV(report) {
  const headers = ['Account Code', 'Account Name', 'Account Type', 'Debit', 'Credit'];
  const rows = [];

  report.forEach(row => {
      if (row.isHeader) {
          rows.push([row.section, '', '', '', '']);
      } else {
          rows.push([
              row.account_code,
              row.account_name,
              row.account_type,
              row.debit,
              row.credit
          ]);
      }
  });

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function generateTransactionsCSV(transactions) {
  const headers = ['Date', 'Transaction No', 'Account Code', 'Description', 'Debit', 'Credit'];
  const rows = transactions.map(t => [
      t.date,
      t.transaction_no,
      t.account_code,
      t.description,
      t.debit,
      t.credit
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

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
      log.error('Error exporting Profit & Loss CSV:', error);
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

ipcMain.on('export-transactions-csv', async (event, report) => {
  try {
    if (!Array.isArray(report) || report.length === 0) {
      dialog.showMessageBoxSync({ type: 'error', message: 'No transactions to export.' });
      return;
    }

    const csvData = generateTransactionsCSV(report);
    const filePath = await showSaveDialog('Transactions.csv');

    if (filePath) {
      fs.writeFileSync(filePath, csvData);
      dialog.showMessageBoxSync({ type: 'info', message: 'Export successful!' });
    }
  } catch (error) {
    log.error('Error exporting Transactions CSV:', error);
    dialog.showMessageBoxSync({ type: 'error', message: 'Export failed.' });
  }
});

function generateTransactionsCSV(report) {
  const headers = ['Date', 'Transaction No', 'Account Code', 'Description', 'Debit', 'Credit'];
  const rows = [headers.join(',')];

  report.forEach(row => {
    if (row.isHeader) {
      rows.push([row.label, '', '', '', '', ''].join(','));
    } else {
      rows.push([
        row.date,
        row.transaction_no,
        row.account_code,
        row.description,
        row.debit,
        row.credit
      ].join(','));
    }
  });

  return rows.join('\n');
}


// Menu
const menuTemplate = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Carry Foward',
        click: () => {
          const companyWindow = getActiveCompanyWindow();
          if (companyWindow) {
            companyWindow.webContents.send('initiate-carry-forward-to-new-company');
          } else {
            log.error('No active company window for carry forward')
          }
        }
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
            log.error("No active window detected.");
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
          const focusedWindow = BrowserWindow.getFocusedWindow();
          if (focusedWindow) {
            focusedWindow.webContents.send('request-export-trial-balance');
          }
        },
      },
      {
        label: 'Transations',
        click: () => {
          const focusedWindow = BrowserWindow.getFocusedWindow();
          if (focusedWindow) {
            focusedWindow.webContents.send('request-export-transactions');
          }
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

  log.info('[Main] App ready');

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
}); 

app.on('window-all-closed', () => {
  log.info('[Main] all windows closed')
  if (isMac) {
    app.quit()
  }
})