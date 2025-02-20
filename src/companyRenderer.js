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
  const saveEditTransactionBtn = document.getElementById('saveEditTransactionBtn');
  const cancelEditTransactionBtn = document.getElementById('cancelEditTransactionBtn');
  const editTransactionRows = document.getElementById('editTransactionRows');
  const transactionNoElement = document.getElementById('last-transaction-no');

  const searchTransactionBtn = document.getElementById('searchTransactionBtn');
  const transactionSearch = document.getElementById('transactionSearch');
  const transactionBody = document.getElementById('main-transaction-body');

  let currentCompanyId = null;
  let originalTransactionSnapshot = []; // Store original transactions

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
  ////////////////////////////////////////// all the functions///////////////////////////////////////////////////////
  // Load company data when the page opens
  window.api.loadTransactions(async (companyId) => {
    try {
      currentCompanyId = companyId;

      const companyName = await window.api.getCompanyName(companyId);
      updateTitle(companyName);

      const transactions = await window.api.getTransactions(companyId);

      loadMainTab(transactions);
      loadTransactionsTab(transactions);
      loadAccountsTab(companyId);

      setupTabNavigation();
    } catch (error) {
      console.error('Error loading data:', error);
      window.api.showMessage('An error occurred while loading company data. Please refresh the page.');
    }
  });

  // Update the title of the company window
  function updateTitle(companyName) {
    document.title = companyName;
    document.getElementById('companyName').textContent = companyName;
  }

    // Load the main tab with the latest transactions
  function loadMainTab(transactions) {
    console.log("loading main tab");
    if (!transactions || transactions.length === 0) {
      transactionBody.innerHTML = '<tr><td colspan="6">No transactions available.</td></tr>';
      return;
    }

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
    console.log("loading transaction tab");
    const transactionsBody = document.getElementById('transactions-body');
    if (!transactions || transactions.length === 0) {
      transactionsBody.innerHTML = '<tr><td colspan="6">No transactions available.</td></tr>';
      return;
    }
    
    // grouping transactions by no.
    const groupedTransactions = transactions.reduce((acc, transaction) => {
      if(!acc[transaction.transaction_no]) {
        acc[transaction.transaction_no] = []
      }
      acc[transaction.transaction_no].push(transaction);
      return acc;
    }, {});

    let tableContent = '';

    Object.keys(groupedTransactions).forEach(transactionNo => {
      tableContent += `
        <tr class="transaction-group">
          <td colspan="6"><strong>Transaction No: ${transactionNo}</strong></td>
        </tr>
      `;

      groupedTransactions[transactionNo].forEach(t => {
        tableContent += `
            <tr>
              <td><span class="clickable date" data-date="${t.date}">${t.date}</span></td>
              <td><span class="clickable transaction-no" data-transaction="${t.transaction_no}">${t.transaction_no}</span></td>
              <td><span class="clickable account-code" data-account="${t.account_code}">${t.account_code}</span></td>
              <td>${t.description}</td>
              <td>${t.debit}</td>
              <td>${t.credit}</td>
            </tr>
        `;
      });
    });

    transactionsBody.innerHTML = tableContent;
  }

  // Load accounts data into the All Accounts tab
  async function loadAccountsTab(companyId) {
    console.log("loading accounts tab");
    try {
      console.log("Getting company ID: ", companyId);
      const accounts = await window.api.getAccounts(companyId);
      const accountsBody = document.getElementById('accounts-body');
  
      // Handle case where no accounts exist
      if (!accounts || accounts.length === 0) {
        accountsBody.innerHTML = '<tr><td colspan="5">No accounts available.</td></tr>';
        return;
      }
  
      // Populate accounts table
      accountsBody.innerHTML = accounts.map(a => `
        <tr>
          <td>${a.account_code}</td>
          <td>${a.account_name}</td>
          <td>${a.account_type}</td>
          <td>${a.total_debit.toFixed(2)}</td>
          <td>${a.total_credit.toFixed(2)}</td>
        </tr>
      `).join('');
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
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

  // Refresh all tabs
  async function refresh(companyId) {
    const transactions = await window.api.getTransactions(companyId);
    loadMainTab(transactions);
    loadTransactionsTab(transactions);
    loadAccountsTab(companyId);
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////// Search transactions ///////////////////////////////////////////////////
  // Search for a transaction
  // Function to display searched transactions
  function displayTransactionDetails(transactions) {
    const mainTransactionBody = document.getElementById('main-transaction-body'); // Main Transactions tab

    if (!transactions || transactions.length === 0) {
        mainTransactionBody.innerHTML = '<tr><td colspan="6">No transactions found.</td></tr>';
        return;
    }

    // Update only the Main Transactions tab with search results
    mainTransactionBody.innerHTML = transactions.map(transaction => `
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


  searchTransactionBtn.addEventListener('click', async () => {
    console.log('Search button clicked');
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
        window.api.showMessage('An error occurred while searching for transactions. Please try again.');
      }
    } else {
      window.api.showMessage('Search query is empty. Please enter a transaction number or description.');
    }
  });
  ///////////////////// clickable on date account code and transaction no.////////////////////////////////////
  document.addEventListener('click', async (event) => {
    let searchQuery = null;

    // Click on a Date
    if (event.target.classList.contains('date')) {
      searchQuery = event.target.dataset.date;
    }

    // Click on a Transaction No.
    if (event.target.classList.contains('transaction-no')) {
      searchQuery = event.target.dataset.transaction;
    }

    // Click on an Account Code
    if (event.target.classList.contains('account-code')) {
      searchQuery = event.target.dataset.account;
    }

    if (searchQuery) {
      // Switch to the Main Transactions tab
      document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
      
      document.querySelector('.tab-button').classList.add('active'); // Activate Main Transaction Tab
      document.getElementById('main-tab').style.display = 'block'; 

      // Update search bar and trigger search
      const searchInput = document.getElementById('transactionSearch');
      searchInput.value = searchQuery;

      // Simulate search button click
      document.getElementById('searchTransactionBtn').click();
    }
  });
    
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////////// adding transactions///////////////////////////////////////////////////
  // Open the Add Transaction modal
  addTransactionBtn.addEventListener('click', async () => {
    addTransactionModal.style.display = 'block';

    // Clear transaction fields
    document.getElementById('transactionDate').value = '';
    document.getElementById('transactionRows').innerHTML = '';

    try{
      const lastTransaction = await window.api.getLastTransaction(currentCompanyId);
      const nextTransactionNo = lastTransaction ? lastTransaction.transaction_no + 1 : 1;

      document.getElementById('transactionNo').value = nextTransactionNo;
    } catch (error) {
      console.error('Error fetching last transaction:', error);
      document.getElementById('transactionNo').value = '';
    }

    const warningElement = document.getElementById('addBalanceWarning');
    warningElement.textContent = '';
    warningElement.style.display = 'none';
  });

  // Close the Add Transaction modal and clear fields
  cancelTransactionBtn.addEventListener('click', () => {
    addTransactionModal.style.display = 'none';
    document.getElementById('transactionRows').innerHTML = ''; // Clear all rows
    document.getElementById('transactionNo').value = '';
    document.getElementById('transactionDate').value = '';
    refresh(currentCompanyId)
  });

  // Save transactions from the modal
  saveTransactionBtn.addEventListener('click', async () => {
    const transactionNo = document.getElementById('transactionNo').value;
    const transactionDate = document.getElementById('transactionDate').value;
    const warningElement = document.getElementById('addBalanceWarning');

    if (!transactionNo || !transactionDate) {
      window.api.showMessage('Transaction No. and Date are required!');
      return;
    }

    try {
      const rows = Array.from(document.querySelectorAll('#transactionRows tr'));
      const transactions = rows.map(row => {
        const accountCode = row.querySelector('.accountCode').value;
        const description = row.querySelector('.description').value || '';
        const debit = parseFloat(row.querySelector('.debit').value) || 0;
        const credit = parseFloat(row.querySelector('.credit').value) || 0;

        if (!accountCode) {
          window.api.showMessage('Please fill in all required fields in each row.');
          throw new Error('Validation failed');
        }

        return {
          transaction_no: transactionNo,
          transaction_date: transactionDate,
          account_code: accountCode,
          description,
          debit,
          credit,
        };
      });

      const totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0);
      const totalCredit = transactions.reduce((sum, t) => sum + t.credit, 0);
      const addDifference = Math.abs(totalDebit - totalCredit);

      if (totalDebit !== totalCredit) {
        warningElement.textContent = `Total Debit (${totalDebit}) is not equal to Total Credit (${totalCredit}). Difference: ${addDifference}.Please adjust transactions.`;
        warningElement.style.display = 'block';
        return;
      } else {
        warningElement.style.display = 'none';
      }

      await window.api.addTransaction(currentCompanyId, transactions);

      window.api.showMessage('Transactions added successfully!');
      addTransactionModal.style.display = 'none';

      refresh(currentCompanyId)
    } catch (error) {
      console.error('Error saving transactions:', error);
      window.api.showMessage('Failed to save transactions.');
    }
  });

   // Add a new row to the transactions table
   async function addTransactionRow() {
    const accountCodes = await fetchAccountCodes(currentCompanyId);
    
    const newRow = document.createElement("tr");
    newRow.innerHTML = `
      <td>
        <select class="accountCode" required>
          <option value="">Select Account</option>
          ${accountCodes.map(code => `<option value="${code}">${code}</option>`).join("")}
        </select>
      </td>
      <td><input type="text" class="description" placeholder="Description"></td>
      <td><input type="number" class="debit" step="0.01" placeholder="Debit"></td>
      <td><input type="number" class="credit" step="0.01" placeholder="Credit"></td>
      <td><button class="remove-row-btn">Remove</button></td>
    `;
  
    document.getElementById("transactionRows").appendChild(newRow);
  }
  addRowBtn.addEventListener('click', addTransactionRow);

  // Remove a row from the transactions table
  document.addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-row-btn')) {
      event.target.closest('tr').remove();
    }
  });

  // Update account prefix options when transaction type changes
  document.addEventListener('change', (event) => {
    if (event.target.classList.contains('transactionType')) {
      updateAccountPrefix(event.target);
    }
  });
  
  function updateAccountPrefix(selectElement) {
    const selectedType = selectElement.value;
    const row = selectElement.closest('tr');
    const prefixElement = row.querySelector('.accountPrefix');
  
    prefixElement.innerHTML = '<option value="">Select Prefix</option>';
  
    if (prefixes[selectedType]) {
      prefixes[selectedType].forEach(prefix => {
        const option = document.createElement('option');
        option.value = prefix;
        option.textContent = prefix;
        prefixElement.appendChild(option);
      });
  
      // Auto-select first prefix if available
      if (prefixes[selectedType].length > 0) {
        prefixElement.value = prefixes[selectedType][0];
      }
    }
  }

  async function fetchAccountCodes(companyId) {
    try {
      const accounts = await window.api.getAccounts(companyId);
      return accounts.map(a => a.account_code);
    } catch (error) {
      console.error("Error fetching account codes:", error);
      return [];
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////// edit transactions /////////////////////////////////////////////////////////
  // Open the Edit Transaction modal
  editTransactionBtn.addEventListener('click', async () => {
    const transactionNoText = transactionNoElement.textContent.replace('Last Transaction No: ', '').trim();
    const searchTransactionNo = transactionSearch.value.trim();

    const transactionNo = searchTransactionNo ? parseInt(searchTransactionNo) : parseInt(transactionNoText);

    if (!transactionNo) {
      window.api.showMessage('No transactions available to edit.');
      return;
    }

    const warningElement = document.getElementById('editBalanceWarning');
    warningElement.textContent = '';
    warningElement.style.display = 'none';

    try{ 
      const transactions = await window.api.getTransactions(currentCompanyId);
      const filteredTransactions = transactions.filter(t => t.transaction_no === transactionNo);
      
      if (filteredTransactions.length === 0){
        window.api.showMessage('No transactions found for the given the transaction no.');
        return;
      }

      originalTransactionSnapshot = JSON.parse(JSON.stringify(filteredTransactions));

      document.getElementById('editTransactionNo').textContent = transactionNo;
      populateModal(filteredTransactions);
      editTransactionModal.style.display = 'block';
    } catch (error) {
      console.error('Error loading transactions:', error)
    }
  });

  // add row btn
  document.getElementById('addEditRowBtn').addEventListener('click', () => {
  
    const newRow = `
      <tr data-transaction-id="">
        <td>
          <select class="transactionType" required>
            <option value="">Select Type</option>
            ${Object.keys(prefixes).map(type => `
              <option value="${type}">${type.charAt(0).toUpperCase() + type.slice(1)}</option>
            `).join('')}
          </select>
        </td>
        <td>
          <select class="accountPrefix" required>
            <option value="">Select Prefix</option>
          </select>
        </td>
        <td><input type="text" class="accountCode" required></td>
        <td><input type="text" class="description"></td>
        <td><input type="number" class="debit" step="0.01" placeholder="0"></td>
        <td><input type="number" class="credit" step="0.01" placeholder="0"></td>
        <td><button class="remove-edit-row-btn">Remove</button></td>
      </tr>
    `;
    editTransactionRows.insertAdjacentHTML('beforeend', newRow);
  
    // Ensure dropdowns update dynamically
    const newTypeSelect = editTransactionRows.lastElementChild.querySelector('.transactionType');
    updateAccountPrefix(newTypeSelect);
  });
  
  
  // Remove Row Button Functionality
  document.addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-edit-row-btn')) {
      event.target.closest('tr').remove();
    }
  });

  function populateModal(transactions) {
    if (transactions.length === 0) return;

    document.getElementById('editTransactionDate').value = transactions[0].date

    editTransactionRows.innerHTML = transactions.map(t => {
      const accountType = Object.keys(prefixes).find(type =>
        prefixes[type].some(prefix => t.account_code.startsWith(prefix))
      ) || '';
  
      const accountPrefix = prefixes[accountType]?.find(prefix =>
        t.account_code.startsWith(prefix)
      ) || '';
  
      const accountCodeWithoutPrefix = accountPrefix ? t.account_code.replace(accountPrefix, '') : t.account_code;
  
      return `
        <tr data-transaction-id="${t.transaction_id}">
          <td>
            <select class="transactionType" required>
              <option value="">Select Type</option>
              ${Object.keys(prefixes).map(type => `
                <option value="${type}" ${type === accountType ? 'selected' : ''}>${type.charAt(0).toUpperCase() + type.slice(1)}</option>
              `).join('')}
            </select>
          </td>
          <td>
            <select class="accountPrefix" required>
              <option value="">Select Prefix</option>
              ${prefixes[accountType]?.map(prefix => `
                <option value="${prefix}" ${prefix === accountPrefix ? 'selected' : ''}>${prefix}</option>
              `).join('') || ''}
            </select>
          </td>
          <td><input type="text" class="accountCode" value="${accountCodeWithoutPrefix}" required></td>
          <td><input type="text" class="description" value="${t.description || ''}"></td>
          <td><input type="number" class="debit" step="0.01" value="${t.debit || 0}" required></td>
          <td><input type="number" class="credit" step="0.01" value="${t.credit || 0}" required></td>
          <td><button class="remove-edit-row-btn">Remove</button></td>
        </tr>
      `;
    }).join('');
  
    document.querySelectorAll('.transactionType').forEach(select => updateAccountPrefix(select));
  }
  

  // Save edited transactions
  saveEditTransactionBtn.addEventListener('click', async () => {
    const rows = Array.from(document.querySelectorAll('#editTransactionRows tr'));
    const transactionNo = document.getElementById('editTransactionNo').textContent;
    const selectedDate =  document.getElementById('editTransactionDate').value;

    const updatedTransactions = rows.map(row => ({
      transaction_id: row.dataset.transactionId || null,
      transaction_no: transactionNo,
      date: selectedDate,
      account_type: row.querySelector('.transactionType').value,
      account_code: `${row.querySelector('.accountPrefix').value}${row.querySelector('.accountCode').value}`,
      description: row.querySelector('.description').value || '',
      debit: parseFloat(row.querySelector('.debit').value) || 0,
      credit: parseFloat(row.querySelector('.credit').value) || 0,
    }));

    const totalDebit = updatedTransactions.reduce((sum, t) => sum + t.debit, 0);
    const totalCredit = updatedTransactions.reduce((sum, t) => sum + t.credit, 0);
    const editDifference = Math.abs(totalDebit - totalCredit);

    const warningElement = document.getElementById('editBalanceWarning');
    if (totalDebit !== totalCredit) {
      warningElement.textContent = `Total Debit (${totalDebit}) is not equal to Total Credit (${totalCredit}). Difference: ${editDifference}.Please adjust transactions.`;
      warningElement.style.display = 'block';
      return;
    } else {
      warningElement.style.display = 'none'; // Hide warning if balance is correct
    }
    
    const modifiedTransactions = [];
    const addedTransactions = [];
    const deletedTransactions = originalTransactionSnapshot.map(t => t.transaction_id);
  
    updatedTransactions.forEach(updated => {
      if (updated.transaction_id) {
        const original = originalTransactionSnapshot.find(t => t.transaction_id == updated.transaction_id);
  
        if (!original) {
          addedTransactions.push(updated);
        } else {
          deletedTransactions.splice(deletedTransactions.indexOf(updated.transaction_id), 1);
  
          if (
            updated.date !== original.date ||
            updated.account_code !== original.account_code ||
            updated.description !== original.description ||
            updated.debit !== original.debit ||
            updated.credit !== original.credit
          ) {
            modifiedTransactions.push(updated);
          }
        }
      } else {
        addedTransactions.push(updated);
      }
    });
  
    if (modifiedTransactions.length === 0 && addedTransactions.length === 0 && deletedTransactions.length === 0) {
      window.api.showMessage('No changes detected.');
      return;
    }
  
    try {
      if (modifiedTransactions.length > 0) {
        await window.api.updateTransactions(currentCompanyId, modifiedTransactions);
      }
      if (addedTransactions.length > 0) {
        await window.api.addTransaction(currentCompanyId, addedTransactions);
      }
      if (deletedTransactions.length > 0) {
        await window.api.deleteTransactions(currentCompanyId, deletedTransactions);
      }
      
      warningElement.style.display = 'none';
      window.api.showMessage('Transactions updated successfully!');
      editTransactionModal.style.display = 'none';
      refresh(currentCompanyId)
    } catch (error) {
      console.error('Error saving transactions:', error);
    }
  });

  // Close the Edit Transaction modal
  cancelEditTransactionBtn.addEventListener('click', () => {
    editTransactionModal.style.display = 'none';
    refresh(currentCompanyId)
  });

  ////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////// key binds /////////////////////////////////////////////////////////
  document.addEventListener('keydown', (event) => {
    if(event.ctrlKey && event.key.toLowerCase() === 'n') {
      event.preventDefault();
      addTransactionBtn.click();
    }

    if(event.ctrlKey && event.key.toLowerCase() === 'e'){
      event.preventDefault();
      editTransactionBtn.click();
    }
  });

  window.api.onOpenAddTransaction(() => {
    console.log('Menu: Open Add Transaction Modal');
    addTransactionBtn.click();
  });
  
  window.api.onOpenEditTransaction(() => {
    console.log('Menu: Open Edit Transaction Modal');
    editTransactionBtn.click();
  });
});
