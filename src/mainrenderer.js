const { ipcRenderer } = require('electron');

// DOM elements
const companyList = document.getElementById('companyList');
const addCompanyBtn = document.getElementById('addCompanyBtn');

// Load list of companies
window.addEventListener('DOMContentLoaded', loadCompanies);

async function loadCompanies() {
  try {
    const companies = await ipcRenderer.invoke('get-companies');
    renderCompanies(companies);
  } catch (error) {
    console.error('Error loading Companies: ', error);
  }
}

// Render list of companies
function renderCompanies(companies) {
  companyList.innerHTML = ''; //clear existing list
  companies.forEach((company) => {
    const listItem = document.createElement('li');
    listItem.textContent = company.name;
    listItem.className = 'company-item';
    listItem.dataset.companyId = company.id;
    listItem.addEventListener('click', () => openCompanyWindow(company.id));
    companyList.appendChild(listItem);
  });
}
