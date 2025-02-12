

// DOM elements
const companyList = document.getElementById('companyList');
const addCompanyBtn = document.getElementById('addCompanyBtn');
const addCompanyModal = document.getElementById('addCompanyModal');
const companyNameInput = document.getElementById('companyNameInput');
const saveCompanyBtn = document.getElementById('saveCompanyBtn');
const cancelCompanyBtn = document.getElementById('cancelCompanyBtn');

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
