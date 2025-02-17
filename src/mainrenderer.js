

// DOM elements
const companyList = document.getElementById('companyList');
const addCompanyBtn = document.getElementById('addCompanyBtn');
const addCompanyModal = document.getElementById('addCompanyModal');
const companyNameInput = document.getElementById('companyNameInput');
const saveCompanyBtn = document.getElementById('saveCompanyBtn');
const cancelCompanyBtn = document.getElementById('cancelCompanyBtn');

const deleteCompanyBtn = document.getElementById('deleteCompanyBtn');
const deleteCompanyModal = document.getElementById('deleteCompanyModal');
const deleteCompanySelect = document.getElementById('deleteCompanySelect');
const confirmDeleteCompanyBtn = document.getElementById('confirmDeleteCompanyBtn');
const cancelDeleteCompanyBtn = document.getElementById('cancelDeleteCompanyBtn');

// Load list of companies
window.addEventListener('DOMContentLoaded', loadCompanies);

async function loadCompanies() {
  try {
    const companies = await window.api.getCompanies(); // Use exposed API
    renderCompanyCards(companies);
  } catch (error) {
    console.error('Error loading companies:', error);
  }
}

// load company cards
function renderCompanyCards(companies) {
  companyList.innerHTML = ''; // Clear existing cards
  companies.forEach((company) => {
    const card = document.createElement('div');
    card.className = 'company-card';
    card.innerHTML = `
      <div class="company-name">${company.name}</div>
    `;

    // event listener to open company window
    card.addEventListener('click', () => {
      window.api.openCompanyWindow(company.id);
    });

    companyList.appendChild(card);
  });
}

// Handle adding a new company
addCompanyBtn.addEventListener('click', () => {
  addCompanyModal.style.display = 'flex';
});

// Hide the modal
cancelCompanyBtn.addEventListener('click', () => {
  addCompanyModal.style.display = 'none';
  companyNameInput.value = ''; // Clear input field
});

// Save company
saveCompanyBtn.addEventListener('click', async () => {
  const name = companyNameInput.value.trim();
  if (!name) {
      alert('Company name is required!');
      return;
  }

  try {
      const response = await window.api.addCompany(name);
      if (!response.success) {
          alert(response.message);
          return;
      }
      addCompanyModal.style.display = 'none';
      companyNameInput.value = '';
      loadCompanies();
  } catch (error) {
      console.error('Error adding company:', error);
      alert('Failed to add company. Please try again.');
  }
});

deleteCompanyBtn.addEventListener('click', async () => {
  try {
    // Load the company list into the dropdown
    const companies = await window.api.getCompanies();
    deleteCompanySelect.innerHTML = companies.map(company => 
      `<option value="${company.id}">${company.name}</option>`
    ).join('');

    // Show the modal
    deleteCompanyModal.style.display = 'flex';
  } catch (error) {
    console.error('Error loading companies for deletion:', error);
    alert('Failed to load companies. Please try again.');
  }
});

confirmDeleteCompanyBtn.addEventListener('click', async () => {
  const companyId = deleteCompanySelect.value;
  if (!companyId) {
    alert('Please select a company to delete.');
    return;
  }

  if (confirm('Are you sure you want to delete this company?')) {
    try {
      await window.api.deleteCompany(companyId);
      alert('Company deleted successfully!');
      deleteCompanyModal.style.display = 'none'; // Hide modal
      loadCompanies(); // Refresh the company list
    } catch (error) {
      console.error('Error deleting company:', error);
      alert('Failed to delete company.');
    }
  }
});

// Close the modal on "Cancel"
cancelDeleteCompanyBtn.addEventListener('click', () => {
  deleteCompanyModal.style.display = 'none';
});
