

// DOM elements
const companyList = document.getElementById('companyList');
const addCompanyBtn = document.getElementById('addCompanyBtn');

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
addCompanyBtn.addEventListener('click', async () => {
  const name = prompt('Enter the name of the new company:');
  if (!name) return; // Exit if no name is provided

  try {
    await window.api.addCompany(name); // Use exposed API
    loadCompanies(); // Reload the company list
  } catch (error) {
    console.error('Error adding company:', error);
  }
});
