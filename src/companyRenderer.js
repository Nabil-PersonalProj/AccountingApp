window.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab-button');
  const sections = document.querySelectorAll('.tab-content');

  const addTransactionBtn = document.getElementById('addTransactionBtn');
  const saveTransactionBtn = document.getElementById('saveTransactionBtn');
  const cancelTransactionBtn = document.getElementById('cancelTransactionBtn');
  const addTransactionModal = document.getElementById('addTransactionModal');
  const transactionTypeElement = document.getElementById('transactionType');
  const accountPrefixElement = document.getElementById('accountPrefix');

  // Prefix mapping for transaction types
  const prefixes = {
    asset: ['CA', 'CB', 'FA', 'PD'],
    liabilities: ['CL'],
    expense: ['EX'],
    equity: ['SC'],
    profit: ['PL'],
    sales: ['SA'],
    debtors: ['TD'],
    creditors: ['TC']
  };

  const searchTransactionBtn = document.getElementById('searchTransactionBtn');
  const transactionSearch = document.getElementById('transactionSearch');
  const transactionBody = document.getElementById('main-transaction-body');

  let currentCompanyId = null;
  // let lastSearchQuery = null; // Store the last successful search query to prevent redundant searches

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
    if (!transactions || transactions.length === 0) {
      transactionBody.innerHTML = '<tr><td colspan="6">No transactions available.</td></tr>';
      return;
    }

    const lastTransaction = transactions.reduce((latest, current) =>
      current.transaction_no > latest.transaction_no ? current : latest, transactions[0]);

    document.getElementById('last-transaction-no').textContent = `Last Transaction No: ${lastTransaction.transaction_no}`;
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

  // Add Transaction Modal Handlers
  addTransactionBtn.addEventListener('click', () => {
    addTransactionModal.style.display = 'block';
  });

  cancelTransactionBtn.addEventListener('click', () => {
    addTransactionModal.style.display = 'none';
  });

  saveTransactionBtn.addEventListener('click', async () => {
    const transaction = {
      transaction_no: parseInt(document.getElementById('transactionNo').value, 10) || 0, // Integer
      account_code: `${document.getElementById('accountPrefix').value}${document.getElementById('accountCode').value}`, // String
      description: document.getElementById('description').value || '', // String
      debit: parseFloat(document.getElementById('debit').value) || 0, // Float
      credit: parseFloat(document.getElementById('credit').value) || 0, // Float
      transaction_date: document.getElementById('date').value || '', // String
      account_type: document.getElementById('transactionType').value || '' // String
    };

    // Debug the transaction data
    console.log('Transaction Data to Send:', transaction);

  
    try {
      console.log('sending from renderer.js');
      const result = await window.api.addTransaction(currentCompanyId, transaction); // Call to main.js
      console.log('Transaction Added:', result);
      alert('Transaction added successfully!');
      addTransactionModal.style.display = 'none';
  
      // Refresh transactions
      const transactions = await window.api.getTransactions(currentCompanyId);
      const accounts = await window.api.getAccounts(currentCompanyId);
      loadMainTab(transactions);
      loadAccountsTab(accounts);
      loadTransactionsTab(transactions);
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Failed to add transaction.');
    }
  });

  // Search Transaction Handler
  searchTransactionBtn.addEventListener('click', async () => {
    const searchQuery = transactionSearch.value.trim();
    if (!currentCompanyId) {
      console.error('Company ID is not loaded yet.');
      return;
    }

    if (searchQuery) {
      try {
        const transactions = await window.api.searchTransaction(currentCompanyId, searchQuery);
        displayTransactionDetails(transactions);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        alert('An error occurred while searching for transactions. Please try again.');
      }
    } else {
      alert('Search query is empty. Please enter a transaction number or description.');
    }
  });

  // Update account prefix options based on selected transaction type
  transactionTypeElement.addEventListener('change', (event) => {
    const selectedType = event.target.value;

    // Clear existing options
    accountPrefixElement.innerHTML = '<option value="">Select Account Prefix</option>';

    if (prefixes[selectedType]) {
      prefixes[selectedType].forEach(prefix => {
        const option = document.createElement('option');
        option.value = prefix;
        option.textContent = prefix;
        accountPrefixElement.appendChild(option);
      });
    }
  });

});


