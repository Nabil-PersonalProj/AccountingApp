const { contextBridge, ipcRenderer } = require('electron');

// Expose APIs to the renderer process
contextBridge.exposeInMainWorld('api', {
    getCompanies: () => ipcRenderer.invoke('get-companies'),
    addCompany: (name) => ipcRenderer.invoke('add-company', name),
    openCompanyWindow: (id) => ipcRenderer.invoke('open-company-window', id),
    getTransactions: (companyId) => ipcRenderer.invoke('get-transactions', companyId),
    loadTransactions: (callback) => ipcRenderer.on('load-transactions', (event, companyId) => callback(companyId)),
});
