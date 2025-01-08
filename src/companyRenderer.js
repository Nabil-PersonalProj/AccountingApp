// Wait for the DOM content to load
window.addEventListener('DOMContentLoaded', () => {

  // Retrieve all relevant DOM elements
  const tabs = document.querySelectorAll('.tab-button');
  const sections = document.querySelectorAll('.tab-content');

  const addTransactionBtn = document.getElementById('addTransactionBtn');
  const saveTransactionBtn = document.getElementById('saveTransactionBtn');
  const cancelTransactionBtn = document.getElementById('cancelTransactionBtn');
  const addTransactionModal = document.getElementById('addTransactionModal');
  const addRowBtn = document.getElementById('addRowBtn');

  const editTransactionBtn = document.getElementById('editTransactionBtn');
  const editTransactionModal = document.getElementById('editTransactionModal'); 
  const cancelEditTransactionBtn = document.getElementById('cancelEditTransactionBtn');

  const searchTransactionBtn = document.getElementById('searchTransactionBtn');
  const transactionSearch = document.getElementById('transactionSearch');
  const transactionBody = document.getElementById('main-transaction-body');

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

  let currentCompanyId = null; // Store the company ID loaded in the UI

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

  // Update the title of the company window
  function updateTitle(companyName) {
    document.title = companyName;
    document.getElementById('companyName').textContent = companyName;
  }

  // Load the main tab with the latest transactions
  function loadMainTab(transactions) {
    if (!transactions || transactions.length === 0) {
      transactionBody.innerHTML = '<tr><td colspan="6">No transactions available.</td></tr>';
      return;
    }

    // Filter transactions to only include the latest transaction number
    const latestTransactionNo = Math.max(...transactions.map(t => t.transaction_no));
    const filteredTransactions = transactions.filter(t => t.transaction_no === latestTransactionNo);

    document.getElementById('last-transaction-no').textContent = `Last Transaction No: ${latestTransactionNo}`;

    transactionBody.innerHTML = filteredTransactions.map(transaction => `
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

  // Load all transactions into the All Transactions tab
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

  // Load accounts data into the All Accounts tab
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

  // Set up tab navigation
  function setupTabNavigation() {
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => {
        sections.forEach(section => section.style.display = 'none');
        tabs.forEach(btn => btn.classList.remove('active'));

        sections[index].style.display = 'block';
        tab.classList.add('active');
      });
    });

    tabs[0].click(); // Default to the main tab
  }

  // Open the Add Transaction modal
  addTransactionBtn.addEventListener('click', () => {
    addTransactionModal.style.display = 'block';
  });

  // Close the Add Transaction modal and clear fields
  cancelTransactionBtn.addEventListener('click', () => {
    addTransactionModal.style.display = 'none';
    document.getElementById('transactionRows').innerHTML = ''; // Clear all rows
    document.getElementById('transactionNo').value = '';
    document.getElementById('transactionDate').value = '';
  });

  // Save transactions from the modal
  saveTransactionBtn.addEventListener('click', async () => {
    const transactionNo = document.getElementById('transactionNo').value;
    const transactionDate = document.getElementById('transactionDate').value;

    if (!transactionNo || !transactionDate) {
      alert('Transaction No. and Date are required!');
      return;
    }

    try {
      const rows = Array.from(document.querySelectorAll('#transactionRows tr'));
      const transactions = rows.map(row => {
        const transactionType = row.querySelector('.transactionType').value;
        const accountPrefix = row.querySelector('.accountPrefix').value;
        const accountCode = `${accountPrefix}${row.querySelector('.accountCode').value}`;
        const description = row.querySelector('.description').value || '';
        const debit = parseFloat(row.querySelector('.debit').value) || 0;
        const credit = parseFloat(row.querySelector('.credit').value) || 0;

        if (!transactionType || !accountPrefix || !accountCode) {
          alert('Please fill in all required fields in each row.');
          throw new Error('Validation failed');
        }

        return {
          transaction_no: transactionNo,
          transaction_date: transactionDate,
          account_type: transactionType,
          account_code: accountCode,
          description,
          debit,
          credit,
        };
      });

      const totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0);
      const totalCredit = transactions.reduce((sum, t) => sum + t.credit, 0);

      if (totalDebit !== totalCredit) {
        alert('Total Debit is not equal to Total Credit. Please Adjust transactions');
        return;
      }

      await Promise.all(
        transactions.map(transaction => window.api.addTransaction(currentCompanyId, transaction))
      );

      alert('Transactions added successfully!');
      addTransactionModal.style.display = 'none';

      const allTransactions = await window.api.getTransactions(currentCompanyId);
      const accounts = await window.api.getAccounts(currentCompanyId);
      loadMainTab(allTransactions);
      loadTransactionsTab(allTransactions);
      loadAccountsTab(accounts);
    } catch (error) {
      console.error('Error saving transactions:', error);
      alert('Failed to save transactions.');
    }
  });

  // Add a new row to the transactions table
  addRowBtn.addEventListener('click', () => {
    const newRow = `
      <tr>
        <td>
          <select class="transactionType" required>
            <option value="">Select Type</option>
            <option value="asset">Asset</option>
            <option value="liabilities">Liabilities</option>
            <option value="expense">Expense</option>
            <option value="equity">Equity</option>
            <option value="profit">Profit</option>
            <option value="sales">Sales</option>
            <option value="debtors">Debtors</option>
            <option value="creditors">Creditors</option>
          </select>
        </td>
        <td>
          <select class="accountPrefix" required>
            <option value="">Select Prefix</option>
          </select>
        </td>
        <td><input type="text" class="accountCode" required placeholder="Code"></td>
        <td><input type="text" class="description" placeholder="Description"></td>
        <td><input type="number" class="debit" step="0.01" placeholder="Debit"></td>
        <td><input type="number" class="credit" step="0.01" placeholder="Credit"></td>
        <td><button class="remove-row-btn">Remove</button></td>
      </tr>
    `;
    document.getElementById('transactionRows').insertAdjacentHTML('beforeend', newRow);
  });

  // Remove a row from the transactions table
  document.addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-row-btn')) {
      event.target.closest('tr').remove();
    }
  });

  // Update account prefix options when transaction type changes
  document.addEventListener('change', (event) => {
    if (event.target.classList.contains('transactionType')) {
      const selectedType = event.target.value;
      const prefixElement = event.target.closest('tr').querySelector('.accountPrefix');

      prefixElement.innerHTML = '<option value="">Select Prefix</option>';

      if (prefixes[selectedType]) {
        prefixes[selectedType].forEach(prefix => {
          const option = document.createElement('option');
          option.value = prefix;
          option.textContent = prefix;
          prefixElement.appendChild(option);
        });
      }
    }
  });

  // open edit modal
  editTransactionBtn.addEventListener('click', () =>{
    editTransactionModal.style.display = 'block';''
  });

  // close edit modal
  cancelEditTransactionBtn.addEventListener('click', () => {
    editTransactionModal.style.display = 'none';
  });

  // Search for a transaction
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
});