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
window.addEventListener('DOMContentLoaded', () => {
  loadCompanies();
});

async function loadCompanies() {
  try {
    window.logging.info('[mainRenderer] loading companies')
    const companies = await window.api.getCompanies(); // Use exposed API
    renderCompanyCards(companies);
  } catch (error) {
    window.logging.error('Error loading companies:', error);
  }
}

// load company cards
function renderCompanyCards(companies) {
  const fragment = document.createDocumentFragment();
  companies.forEach((company) => {
    const card = document.createElement('div');
    card.className = 'company-card';
    card.innerHTML = `<div class="company-name">${company.name}</div>`;
    card.addEventListener('click', () => window.api.openCompanyWindow(company.id));
    fragment.appendChild(card);
  });
  companyList.innerHTML = ''; // Clear only once
  companyList.appendChild(fragment); // Append all at once
  window.logging.info('[mainRenderer] loading company cards');
}

// Handle adding a new company
addCompanyBtn.addEventListener('click', () => {
  window.api.openAddCompanyWindow();
});

deleteCompanyBtn.addEventListener('click', async () => {
  try {
    // Load the company list into the dropdown
    const companies = await window.api.getCompanies();
    deleteCompanySelect.innerHTML = companies.map(company => 
      `<option value="${company.id}">${company.name}</option>`
    ).join('');

    window.logging.info('[mainRenderer] deleting company');

    // Show the modal
    deleteCompanyModal.style.display = 'flex';
  } catch (error) {
    window.logging.error('Error loading companies for deletion:', error);
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
      window.logging.error('Error deleting company:', error);
      alert('Failed to delete company.');
    }
  }
});

// Close the modal on "Cancel"
cancelDeleteCompanyBtn.addEventListener('click', () => {
  deleteCompanyModal.style.display = 'none';
});

// movable modal
function makeModalDraggable(modal, header) {
  let isDragging = false;
  let offsetX, offsetY;

  header.addEventListener("mousedown", (event) => {
    isDragging = true;
    offsetX = event.clientX - modal.offsetLeft;
    offsetY = event.clientY - modal.offsetTop;
    modal.style.position = "absolute";
    modal.style.zIndex = "1001"; // Ensure modal is above other elements
  });

  document.addEventListener("mousemove", (event) => {
    if (isDragging) {
      modal.style.left = event.clientX - offsetX + "px";
      modal.style.top = event.clientY - offsetY + "px";
    }
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });
}

// Apply draggable functionality after the DOM has loaded
window.addEventListener("DOMContentLoaded", () => {
  const modals = [
    { modal: "addCompanyModal", header: "addCompanyModalHeader" },
    { modal: "deleteCompanyModal", header: "deleteCompanyModalHeader" }
  ];

  modals.forEach(({ modal, header }) => {
    const modalElement = document.getElementById(modal);
    const headerElement = document.getElementById(header);
    if (modalElement && headerElement) {
      makeModalDraggable(modalElement, headerElement);
    }
  });
});

window.api.receive('refresh-companies', () => {
  window.logging.info('[mainRenderer] reload companies');
  loadCompanies();
});

