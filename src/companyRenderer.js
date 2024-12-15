// Listen for the company ID sent from the main process
window.api.loadTransactions(async (companyId) => {
    try {
      const transactions = await window.api.getTransactions(companyId);
      const companyName = await window.api.getCompanyName(companyId);
      const accounts = await window.api.getAccounts(companyId)

      updateTitle(companyName); // Set the window title
      loadMainTab(transactions); // Load the main tab with one transaction
      loadTransactionsTab(transactions); // Load all transactions
      loadAccountsTab(accounts); // Load all accounts
  
      setupTabNavigation(); // Initialize tab navigation

    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  });

  // Update the window title with the company's name
function updateTitle(companyName) {
    document.title = `Transactions - ${companyName}`;
    const header = document.getElementById('companyName');
    header.textContent = `${companyName} - Transactions`;
  }

  // Main Tab: Show only one specific transaction (the latest transaction for simplicity)
function loadMainTab(transactions) {
  const section = document.getElementById('main-tab');
  section.innerHTML = ''; // Clear content

  if (!transactions || transactions.length === 0) {
    section.innerHTML = '<p>No transactions available.</p>';
    return;
  }

  // Display the latest transaction as an example
  const transaction = transactions[0];

  const table = `
    <table class="main-transaction-table">
      <tr><th>Date</th><td>${transaction.date}</td></tr>
      <tr><th>Transaction No</th><td>${transaction.transaction_no}</td></tr>
      <tr><th>Account Code</th><td>${transaction.account_code}</td></tr>
      <tr><th>Description</th><td>${transaction.description}</td></tr>
      <tr><th>Debit</th><td>${transaction.debit}</td></tr>
      <tr><th>Credit</th><td>${transaction.credit}</td></tr>
    </table>
  `;

  section.innerHTML = table;
}

// Transactions Tab: Show all transactions in a table
function loadTransactionsTab(transactions) {
  const section = document.getElementById('transactions-tab');
  section.innerHTML = ''; // Clear content

  if (!transactions || transactions.length === 0) {
    section.innerHTML = '<p>No transactions found.</p>';
    return;
  }

  // Create the transactions table
  const table = document.createElement('table');
  table.className = 'transactions-table';

  table.innerHTML = `
    <thead>
      <tr>
        <th>Date</th>
        <th>Transaction No</th>
        <th>Account Code</th>
        <th>Description</th>
        <th>Debit</th>
        <th>Credit</th>
      </tr>
    </thead>
    <tbody>
      ${transactions
        .map(
          (t) => `
        <tr>
          <td>${t.date}</td>
          <td>${t.transaction_no}</td>
          <td>${t.account_code}</td>
          <td>${t.description}</td>
          <td>${t.debit}</td>
          <td>${t.credit}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  `;

  section.appendChild(table);
}

// Accounts Tab: Show all accounts with debit and credit summary
async function loadAccounts(companyId) {
  try {
    const accounts = await window.api.getAccounts(companyId);
    renderAccounts(accounts);
  } catch (error) {
    console.error('Error loading accounts:', error);
  }
}

// Render the accounts table
function renderAccounts(accounts) {
  const accountsSection = document.getElementById('accounts');
  accountsSection.innerHTML = '';

  if (!accounts || accounts.length === 0) {
    accountsSection.innerHTML = '<p>No accounts found for this company.</p>';
    return;
  }

  const table = document.createElement('table');
  table.className = 'accounts-table';

  table.innerHTML = `
    <thead>
      <tr>
        <th>Account Code</th>
        <th>Description</th>
        <th>Debit</th>
        <th>Credit</th>
      </tr>
    </thead>
    <tbody>
      ${accounts.map(account => `
        <tr>
          <td>${account.account_code}</td>
          <td>${account.description}</td>
          <td>${account.debit}</td>
          <td>${account.credit}</td>
        </tr>
      `).join('')}
    </tbody>
  `;

  accountsSection.appendChild(table);
}

// Tab Navigation: Enable switching between tabs
function setupTabNavigation() {
  const tabs = document.querySelectorAll('.tab-button');
  const sections = document.querySelectorAll('.tab-content');

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      // Hide all sections and deactivate all tabs
      sections.forEach((section) => (section.style.display = 'none'));
      tabs.forEach((btn) => btn.classList.remove('active'));

      // Show the selected tab content and mark the button as active
      sections[index].style.display = 'block';
      tab.classList.add('active');
    });
  });

  // Default: Activate the first tab
  tabs[0].click();
}