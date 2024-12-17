window.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab-button');
  const tabSections = document.querySelectorAll('.tab-content');
  let currentCompanyId = null;

  // Event listener for the company ID sent from the main process
  window.api.loadTransactions(async (companyId) => {
    try {
      currentCompanyId = companyId;

      const companyName = await window.api.getCompanyName(companyId);
      updateTitle(companyName);

      const transactions = await window.api.getTransactions(companyId);
      const accounts = await window.api.getAccounts(companyId);

      loadMainTab(transactions); // Load the last transaction into Main Tab
      loadTransactionsTab(transactions); // Load all transactions
      loadAccountsTab(accounts); // Load all accounts

      setupTabNavigation(); // Enable tab navigation
    } catch (error) {
      console.error('Error loading company data:', error);
    }
  });

  // Update the window title and header with the company's name
  function updateTitle(companyName) {
    document.title = `${companyName}`;
    const header = document.getElementById('companyName');
    header.textContent = `${companyName}`;
  }

  // Main Tab: Show the last transaction (sorted by transaction_no)
  function loadMainTab(transactions) {
    const section = document.getElementById('main-tab');
    section.innerHTML = ''; // Clear content

    if (!transactions || transactions.length === 0) {
      section.innerHTML = '<p>No transactions available.</p>';
      return;
    }

    // Find the last transaction based on transaction_no
    const lastTransaction = transactions.reduce((latest, current) => {
      return current.transaction_no > latest.transaction_no ? current : latest;
    }, transactions[0]);

    const table = `
      <table class="transactions-table">
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
          <tr>
            <td>${lastTransaction.date}</td>
            <td>${lastTransaction.transaction_no}</td>
            <td>${lastTransaction.account_code}</td>
            <td>${lastTransaction.description}</td>
            <td>${lastTransaction.debit}</td>
            <td>${lastTransaction.credit}</td>
          </tr>
        </tbody>
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

    const table = `
      <table class="transactions-table">
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
      </table>
    `;

    section.innerHTML = table;
  }

  // Accounts Tab: Show all accounts with debit and credit summary
  function loadAccountsTab(accounts) {
    const section = document.getElementById('accounts-tab');
    section.innerHTML = ''; // Clear content

    if (!accounts || accounts.length === 0) {
      section.innerHTML = '<p>No accounts found for this company.</p>';
      return;
    }

    const table = `
      <table class="accounts-table">
        <thead>
          <tr>
            <th>Account Code</th>
            <th>Description</th>
            <th>Debit</th>
            <th>Credit</th>
          </tr>
        </thead>
        <tbody>
          ${accounts
            .map(
              (a) => `
            <tr>
              <td>${a.account_code}</td>
              <td>${a.description}</td>
              <td>${a.debit}</td>
              <td>${a.credit}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;

    section.innerHTML = table;
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
});
