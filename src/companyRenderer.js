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

    let totalDebit = 0;
    let totalCredit = 0;
    let tableContent = '';

    Object.keys(groupedTransactions).forEach(transactionNo => {
      tableContent += `
        <tr class="transaction-group">
          <td colspan="6"><strong>Transaction No: ${transactionNo}</strong></td>
        </tr>
      `;

      groupedTransactions[transactionNo].forEach(t => {
        totalCredit += parseFloat(t.credit) || 0;
        totalDebit += parseFloat(t.debit) || 0;

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
    document.getElementById('final-debit').textContent = totalDebit.toFixed(2);
    document.getElementById('final-credit').textContent = totalCredit.toFixed(2);
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

      const groupedAccounts = {};
      accounts.forEach(account => {
        if (!groupedAccounts[account.account_type]) {
            groupedAccounts[account.account_type] = [];
        }
        groupedAccounts[account.account_type].push(account);
      });
  
      let tableContent = '';
      let totalAccountDebit = 0;
      let totalAccountCredit = 0;

      Object.keys(groupedAccounts).forEach(type => {
          tableContent += `<tr class="account-group"><td colspan="5"><strong>${type}</strong></td></tr>`;
          groupedAccounts[type].forEach(a => {
              totalAccountCredit += parseFloat(a.credit) || 0;
              totalAccountDebit += parseFloat(a.debit) || 0;

              const debitValue = a.debit !== undefined ? a.debit : "0.00";
              const creditValue = a.credit !== undefined ? a.credit : "0.00";

              tableContent += `
                  <tr>
                      <td><span class="clickable account-code" data-account="${a.account_code}">${a.account_code}</span></td>
                      <td>${a.account_name}</td>
                      <td>${a.account_type}</td>
                      <td>${parseFloat(debitValue).toFixed(2)}</td>
                      <td>${parseFloat(creditValue).toFixed(2)}</td>
                  </tr>
              `;
          });
      });

      accountsBody.innerHTML = tableContent;
      document.getElementById('final-account-debit').textContent = totalAccountDebit.toFixed(2);
      document.getElementById('final-account-credit').textContent = totalAccountCredit.toFixed(2);
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
      <td><button class="remove-row-btn">🗑️</button></td>
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
  async function addEditTransactionRow() {
    const accountCodes = await fetchAccountCodes(currentCompanyId);

    if (accountCodes.length === 0) {
      window.api.showMessage("No accounts available. Please add accounts first.");
      return;
    }
  
    const newRow = document.createElement("tr");
    newRow.innerHTML = `
      <td>
        <select class="accountCode" required>
          <option value="">Select Account</option>
          ${accountCodes.map(code => `<option value="${code}">${code}</option>`).join('')}
        </select>
      </td>
      <td><input type="text" class="description"></td>
      <td><input type="number" class="debit" step="0.01" placeholder="0"></td>
      <td><input type="number" class="credit" step="0.01" placeholder="0"></td>
      <td><button class="remove-edit-row-btn">Remove</button></td>
    `;
    
    document.getElementById("editTransactionRows").appendChild(newRow);
  }
  
  document.getElementById("addEditRowBtn").addEventListener("click", addEditTransactionRow)
  
  
  // Remove Row Button Functionality
  document.addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-edit-row-btn')) {
      event.target.closest('tr').remove();
    }
  });

  async function populateModal(transactions) {
    if (transactions.length === 0) return;
    
    const accountCodes = await fetchAccountCodes(currentCompanyId);

    if (accountCodes.length === 0) {
        window.api.showMessage("No accounts available. Please add accounts first.");
        return;
    }

    document.getElementById('editTransactionDate').value = transactions[0].date;

    editTransactionRows.innerHTML = transactions.map(t => {
        return `
        <tr data-transaction-id="${t.transaction_id}">
          <td>
            <select class="accountCode" required>
              <option value="">Select Account</option>
              ${accountCodes.map(code => `<option value="${code}" ${code === t.account_code ? 'selected' : ''}>${code}</option>`).join('')}
            </select>
          </td>
          <td><input type="text" class="description" value="${t.description || ''}"></td>
          <td><input type="number" class="debit" step="0.01" value="${t.debit || 0}" required></td>
          <td><input type="number" class="credit" step="0.01" value="${t.credit || 0}" required></td>
          <td><button class="remove-edit-row-btn">🗑️</button></td>
        </tr>
        `;
    }).join('');
  }

  // Save edited transactions
  saveEditTransactionBtn.addEventListener('click', async () => {
    const rows = Array.from(document.querySelectorAll('#editTransactionRows tr'));
    const transactionNo = document.getElementById('editTransactionNo').textContent;
    const selectedDate =  document.getElementById('editTransactionDate').value;

    const updatedTransactions = rows.map(row => {
      const accountCode = row.querySelector('.accountCode').value;
      if (!accountCode) {
        window.api.showMessage("Please select an account for each transaction.");
        throw new Error("Validation failed: Missing account code.");
      }
    
      return {
        transaction_id: row.dataset.transactionId || null,
        transaction_no: transactionNo,
        date: selectedDate,
        account_code: accountCode,
        description: row.querySelector('.description').value || '',
        debit: parseFloat(row.querySelector('.debit').value) || 0,
        credit: parseFloat(row.querySelector('.credit').value) || 0,
      };
    });

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
  
    if (JSON.stringify(originalTransactionSnapshot) === JSON.stringify(updatedTransactions)) {
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
  //////////////////////////// Accounts /////////////////////////////////////////////////////////
  window.api.onOpenAddAccount(() => {
    document.getElementById('accountManagerModal').style.display = 'block';
    loadAccountManager();
  })

  document.getElementById('cancelAccountChangesBtn').addEventListener('click', ()=> {
    document.getElementById('accountManagerModal').style.display = 'none';
    refresh(currentCompanyId)
  })

  document.getElementById('saveAccountChangesBtn').addEventListener('click', async () => {
    const rows = document.querySelectorAll('#accountManagerBody tr');
    const modifiedAccounts = [];
    const newAccounts = [];
    const deletedAccounts = [...window.originalAccounts];

    const allAccountCodes = new Set();
    let hasDuplicates = false;

    rows.forEach(row => {
        const accountCodeInput = row.querySelector('.account-code');
        const accountCode = accountCodeInput ? accountCodeInput.value.trim() : row.dataset.accountId;
        const accountName = row.querySelector('.account-name').value.trim();
        const accountType = row.querySelector('.account-type').value.trim();

        // Check if account code already exists
        if (allAccountCodes.has(accountCode)) {
          hasDuplicates = true;
          //accountCodeInput.style.border = "2px solid red"; // Highlight the duplicate field
        } else {
          allAccountCodes.add(accountCode);
          //accountCodeInput.style.border = ""; // Remove highlight if valid
        }
      
        if (!accountCode || !accountName || !accountType) {
          window.api.showMessage("All fields are required!");
          return;
        }
    
        if (row.classList.contains('new-account-row')) {
            newAccounts.push({ account_code: accountCode, account_name: accountName, account_type: accountType });
        } else {
            const original = window.originalAccounts.find(a => a.account_code === accountCode);
            if (original) {
                deletedAccounts.splice(deletedAccounts.indexOf(original), 1);
                if (original.account_name !== accountName || original.account_type !== accountType) {
                    modifiedAccounts.push({ account_code: accountCode, account_name: accountName, account_type: accountType });
                }
            }
        }
    });

    if (hasDuplicates) {
      window.api.showMessage("Duplicate account codes detected. Please ensure each account code is unique.");
      return;
    }

    try {
        if (newAccounts.length > 0) {
            const addPromises = newAccounts.map(acc => window.api.addAccount(currentCompanyId, acc.account_code, acc.account_name, acc.account_type));
            await Promise.all(addPromises);
        }
        if (modifiedAccounts.length > 0) {
            await window.api.updateAccounts(currentCompanyId, modifiedAccounts);
        }
        if (deletedAccounts.length > 0) {
            const deletePromises = deletedAccounts.map(acc => window.api.deleteAccount(currentCompanyId, acc.account_code));
            await Promise.all(deletePromises);
        }

        window.api.showMessage('Account changes saved successfully!');
        document.getElementById('accountManagerModal').style.display = 'none';
        refresh(currentCompanyId);
    } catch (error) {
        console.error('Error saving account changes:', error);
    }
    refresh(currentCompanyId)
  });

  document.addEventListener('click', (event) => {
    if(event.target.classList.contains('delete-account-btn')) {
      const row = event.target.closest('tr');
      row.remove();
    }
  })

  // Add a new row for adding an account
  document.getElementById('addAccountRowBtn').addEventListener('click', () => {
    const accountBody = document.getElementById('accountManagerBody');

    const newRow = document.createElement('tr');
    newRow.classList.add('new-account-row'); // Tag new rows
    newRow.innerHTML = `
        <td><input type="text" class="account-code" placeholder="Enter code"></td>
        <td><input type="text" class="account-name" placeholder="Enter name"></td>
        <td>
          <select class="account-type">
            ${generateAccountType("")}
            
          </select>
        </td>
        <td><button class="delete-account-btn">🗑️</button></td>
    `;

    accountBody.appendChild(newRow);
  });

  function generateAccountType(selectedType) {
    const accountTypes = ["Asset", "Liabilities", "Expense", "Equity", "Profit & Loss",
      "Sales", "Cost of Sale", "Debtor", "Creditor", "Fixed Asset", "Accumulated Depreciation"
    ]

    return accountTypes.map(type => 
      `<option value="${type}" ${type === selectedType ? "selected" : ""}>${type}</option>`
    ).join('');
  }

  // Load Accounts into Editable Table
  async function loadAccountManager() {
    try {
        const accounts = await window.api.getAccounts(currentCompanyId);
        const accountBody = document.getElementById('accountManagerBody');

        // Store Original Accounts for Snapshot
        window.originalAccounts = JSON.parse(JSON.stringify(accounts));

        if (!accounts || accounts.length === 0) {
            accountBody.innerHTML = '<tr><td colspan="4">No accounts available.</td></tr>';
            return;
        }

        accountBody.innerHTML = accounts.map(a => `
            <tr data-account-id="${a.account_code}">
                <td>${a.account_code}</td>
                <td><input type="text" class="account-name" value="${a.account_name}"></td>
                <td>
                  <select class="account-type">
                    ${generateAccountType(a.accountType)}
                  </select>
                </td>
                <td><button class="delete-account-btn">🗑️</button></td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading accounts:', error);
    }
  }

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

  window.api.receive('request-company-id', () => {
    if (currentCompanyId) {
      console.log("Sending company ID to main process:", currentCompanyId);
      window.api.send('fetch-company-id', currentCompanyId);
    } else {
      console.error("No company ID found.");
      window.api.showMessage("No active company selected.");
    }
  });
});
