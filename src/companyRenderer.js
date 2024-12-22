window.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab-button');
  const sections = document.querySelectorAll('.tab-content');
  let currentCompanyId = null;
  let lastSearchQuery = null; // Store the last successful search query to prevent redundant searches

  // Load company data when the page opens
  window.api.loadTransactions(async (companyId) => {
    try {
      currentCompanyId = companyId;

      const companyName = await window.api.getCompanyName(companyId);
      updateTitle(companyName);

      const transactions = await window.api.getTransactions(companyId);
      const accounts = await window.api.getAccounts(companyId);

      loadMainTab(transactions);
      loadTransactionsTab(transactions);
      loadAccountsTab(accounts);

      setupTabNavigation();
    } catch (error) {
      console.error('Error loading data:', error);
      alert('An error occurred while loading company data. Please refresh the page.');
    }
  });

  function updateTitle(companyName) {
    document.title = companyName;
    document.getElementById('companyName').textContent = companyName;
  }

  function loadMainTab(transactions) {
    const transactionBody = document.getElementById('main-transaction-body');
    const transactionNoInfo = document.getElementById('last-transaction-no');

    if (!transactions || transactions.length === 0) {
      transactionBody.innerHTML = '<tr><td colspan="6">No transactions available.</td></tr>';
      transactionNoInfo.textContent = 'Last Transaction No: None';
      return;
    }

    const lastTransaction = transactions.reduce((latest, current) =>
      current.transaction_no > latest.transaction_no ? current : latest, transactions[0]);

    transactionNoInfo.textContent = `Last Transaction No: ${lastTransaction.transaction_no}`;
    transactionBody.innerHTML = `
      <tr>
        <td>${lastTransaction.date}</td>
        <td>${lastTransaction.transaction_no}</td>
        <td>${lastTransaction.account_code}</td>
        <td>${lastTransaction.description}</td>
        <td>${lastTransaction.debit}</td>
        <td>${lastTransaction.credit}</td>
      </tr>
    `;
  }

  function loadTransactionsTab(transactions) {
    const transactionsBody = document.getElementById('transactions-body');
    if (!transactions || transactions.length === 0) {
      transactionsBody.innerHTML = '<tr><td colspan="6">No transactions available.</td></tr>';
      return;
    }
    transactionsBody.innerHTML = transactions.map(t => `
      <tr>
        <td>${t.date}</td>
        <td>${t.transaction_no}</td>
        <td>${t.account_code}</td>
        <td>${t.description}</td>
        <td>${t.debit}</td>
        <td>${t.credit}</td>
      </tr>
    `).join('');
  }

  function loadAccountsTab(accounts) {
    const accountsBody = document.getElementById('accounts-body');
    if (!accounts || accounts.length === 0) {
      accountsBody.innerHTML = '<tr><td colspan="4">No accounts available.</td></tr>';
      return;
    }
    accountsBody.innerHTML = accounts.map(a => `
      <tr>
        <td>${a.account_code}</td>
        <td>${a.description}</td>
        <td>${a.debit}</td>
        <td>${a.credit}</td>
      </tr>
    `).join('');
  }

  document.getElementById('searchTransactionBtn').addEventListener('click', async () => {
    const searchQuery = document.getElementById('transactionSearch').value.trim();
    if (!currentCompanyId) {
      console.error('Company ID is not loaded yet.');
      return;
    }

    if (searchQuery && searchQuery !== lastSearchQuery) {
      lastSearchQuery = searchQuery; // Update last query
      try {
        const transactions = await window.api.searchTransaction(currentCompanyId, searchQuery);
        displayTransactionDetails(transactions); // Assuming the first match is displayed
      } catch (error) {
        console.error('Error fetching transactions:', error);
        alert('An error occurred while searching for transactions. Please try again.');
      }
    } else if (!searchQuery) {
      alert('Search query is empty. Please enter a transaction number or description.');
    }
  });

  function displayTransactionDetails(transactions) {
    const detailsSection = document.getElementById('main-transaction-body');
    if (!transactions || transactions.length === 0) {
      detailsSection.innerHTML = '<tr><td colspan="6">No transactions found matching your query.</td></tr>';
      return;
    }
  
    // Display all matching transactions
    detailsSection.innerHTML = transactions.map(transaction => `
      <tr>
        <td>${transaction.date}</td>
        <td>${transaction.transaction_no}</td>
        <td>${transaction.account_code}</td>
        <td>${transaction.description}</td>
        <td>${transaction.debit}</td>
        <td>${transaction.credit}</td>
      </tr>
    `).join('');
  }

  function setupTabNavigation() {
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => {
        sections.forEach((section) => section.style.display = 'none');
        tabs.forEach((btn) => btn.classList.remove('active'));

        sections[index].style.display = 'block';
        tab.classList.add('active');
      });
    });

    tabs[0].click(); // Default to Main Tab
  }
});
