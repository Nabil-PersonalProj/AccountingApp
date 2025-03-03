const { contextBridge, ipcRenderer } = require('electron');

// Expose APIs to the renderer process
contextBridge.exposeInMainWorld('api', {
    showMessage: (message, title = 'Notification') => ipcRenderer.invoke('show-message', message, title),
    getCompanies: () => ipcRenderer.invoke('get-companies'),
    addCompany: (name) => ipcRenderer.invoke('add-company', name),
    openCompanyWindow: (id) => ipcRenderer.invoke('open-company-window', id),
    getCompanyName: (companyId) => ipcRenderer.invoke('get-company-name', companyId),
    getTransactions: (companyId) => ipcRenderer.invoke('get-transactions', companyId),
    loadTransactions: (callback) => ipcRenderer.on('load-transactions', (event, companyId) => callback(companyId)),
    getLastTransaction: (companyId) => ipcRenderer.invoke('get-last-transaction', companyId),
    getAccounts: (companyId) => ipcRenderer.invoke('get-accounts', companyId),
    searchTransaction: (companyId, query) => ipcRenderer.invoke('search-transaction', companyId, query),
    addTransaction: (companyId, transactions) => ipcRenderer.invoke('add-transaction', companyId, transactions),
    updateTransactions: (companyId, transactions) => ipcRenderer.invoke('update-transactions', companyId, transactions),
    deleteTransactions: (companyId, transactionIds) => ipcRenderer.invoke('delete-transactions', companyId, transactionIds),
    openAddTransaction: () => ipcRenderer.send('open-add-transaction'),
    openEditTransaction: () => ipcRenderer.send('open-edit-transaction'),
    onOpenAddTransaction: (callback) => ipcRenderer.on('open-add-transaction', callback),
    onOpenEditTransaction: (callback) => ipcRenderer.on('open-edit-transaction', callback),
    deleteCompany: (companyId) => ipcRenderer.invoke('delete-company', companyId),
    addAccount: (companyId, accountCode, accountName, accountType) => ipcRenderer.invoke('add-account', companyId,accountCode,accountName,accountType),
    onOpenAddAccount: (callback) => ipcRenderer.on('open-add-account', callback),
    updateAccounts: (companyId, accounts) => ipcRenderer.invoke('update-accounts', companyId, accounts),
    deleteAccount: (companyId, accountCode) => ipcRenderer.invoke('delete-account', companyId, accountCode),
});
