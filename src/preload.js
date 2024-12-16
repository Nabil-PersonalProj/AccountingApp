const { contextBridge, ipcRenderer } = require('electron');

// Expose APIs to the renderer process
contextBridge.exposeInMainWorld('api', {
    getCompanies: () => ipcRenderer.invoke('get-companies'),
    addCompany: (name) => ipcRenderer.invoke('add-company', name),
    openCompanyWindow: (id) => ipcRenderer.invoke('open-company-window', id),
    getCompanyName: (companyId) => ipcRenderer.invoke('get-company-name', companyId),
    getTransactions: (companyId) => ipcRenderer.invoke('get-transactions', companyId),
    loadTransactions: (callback) => ipcRenderer.on('load-transactions', (event, companyId) => callback(companyId)),
    getLastTransaction: (companyId) => ipcRenderer.invoke('get-last-transaction', companyId),
    getAccounts: (companyId) => ipcRenderer.invoke('get-accounts', companyId),
});
