// Wait for the DOM content to load
window.addEventListener('DOMContentLoaded', () => {
    // Retrieve all relevant DOM elements
    const tabs = document.querySelectorAll('.tab-button');
    const sections = document.querySelectorAll('.tab-content');
  
    const addTransactionBtn = document.getElementById('addTransactionBtn');
    const editTransactionBtn = document.getElementById('editTransactionBtn');
    const searchTransactionBtn = document.getElementById('searchTransactionBtn');
    const transactionSearch = document.getElementById('transactionSearch');
    const transactionBody = document.getElementById('main-transaction-body');
    const transactionNoElement = document.getElementById('last-transaction-no');
  
    let currentCompanyId = null;
  
    ////////////////////////////////////////// Load Company Data //////////////////////////////////////////
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
  
    // Load all transactions into the Transactions tab
    function loadTransactionsTab(transactions) {
      console.log("loading transaction tab");
      const transactionsBody = document.getElementById('transactions-body');
      if (!transactions || transactions.length === 0) {
        transactionsBody.innerHTML = '<tr><td colspan="6">No transactions available.</td></tr>';
        return;
      }
      
      // Group transactions by transaction number
      const groupedTransactions = transactions.reduce((acc, transaction) => {
        if (!acc[transaction.transaction_no]) acc[transaction.transaction_no] = [];
        acc[transaction.transaction_no].push(transaction);
        return acc;
      }, {});
  
      let totalDebit = 0;
      let totalCredit = 0;
      let tableContent = '';
  
      Object.keys(groupedTransactions).forEach(transactionNo => {
        tableContent += `<tr class="transaction-group"><td colspan="6"><strong>Transaction No: ${transactionNo}</strong></td></tr>`;
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
        console.log("Getting company ID:", companyId);
        const accounts = await window.api.getAccounts(companyId);
        const accountsBody = document.getElementById('accounts-body');
  
        if (!accounts || accounts.length === 0) {
          accountsBody.innerHTML = '<tr><td colspan="5">No accounts available.</td></tr>';
          return;
        }
  
        const groupedAccounts = {};
        accounts.forEach(account => {
          if (!groupedAccounts[account.account_type]) groupedAccounts[account.account_type] = [];
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
  
            tableContent += `
              <tr>
                <td><span class="clickable account-code" data-account="${a.account_code}">${a.account_code}</span></td>
                <td>${a.account_name}</td>
                <td>${a.account_type}</td>
                <td>${parseFloat(a.debit || 0).toFixed(2)}</td>
                <td>${parseFloat(a.credit || 0).toFixed(2)}</td>
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

    ///////////////////////////// Open Add & Edit Transaction Windows /////////////////////////////
    addTransactionBtn.addEventListener('click', () => {
      if (!currentCompanyId) {
        window.api.showMessage('No company selected. Please select a company first.');
        return;
      }
      window.api.openAddTransactionWindow(currentCompanyId);
    });
  
    editTransactionBtn.addEventListener('click', async () => {
      const transactionNoText = document.getElementById('last-transaction-no').textContent.replace('Last Transaction No: ', '').trim();
      const searchTransactionNo = document.getElementById('transactionSearch').value.trim();
      const transactionNo = searchTransactionNo ? parseInt(searchTransactionNo) : parseInt(transactionNoText);
  
      console.log("🚀 Sending Edit Request for Transaction No:", transactionNo);
  
      if (!transactionNo || isNaN(transactionNo)) {
        window.api.showMessage('No transactions available to edit.');
        return;
      }
  
      window.api.openEditTransactionWindow(currentCompanyId, transactionNo);
    });
  
    ///////////////////////////// APIS /////////////////////////////
    window.api.receive('refresh-transactions', (companyId) => {
      console.log("Refreshing transactions for company ID:", companyId);
      refresh(companyId);
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
      const accountTypes = [
          "Asset", "Liabilities", "Expense", "Equity", "Profit & Loss",
          "Sales", "Cost of Sale", "Debtor", "Creditor", "Fixed Asset", "Accumulated Depreciation"
      ];
  
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

            accounts.sort((a, b) => a.account_code.localeCompare(b.account_code));

            if (!accounts || accounts.length === 0) {
                accountBody.innerHTML = '<tr><td colspan="4">No accounts available.</td></tr>';
                return;
            }

            accountBody.innerHTML = accounts.map(a => `
                <tr data-account-id="${a.account_code}">
                    <td><input type="text" class="account-code" value="${a.account_code}"></td>
                    <td><input type="text" class="account-name" value="${a.account_name}"></td>
                    <td>
                    <select class="account-type">
                        ${generateAccountType(a.account_type)}
                    </select>
                    </td>
                    <td><button class="delete-account-btn">🗑️</button></td>
                </tr>
            `
           ).join('');
          } catch (error) {
            console.error('Error loading accounts:', error);
          }
    }


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
    
  });

window.api.receive('request-export-trial-balance', async () => {
    const companyId = await window.api.getActiveCompanyId();
    window.api.send('export-trial-balance-csv', companyId);
});

window.api.receive('request-export-transactions', async () => {
    const companyId = await window.api.getActiveCompanyId();
    window.api.send('export-transactions-csv', companyId);
});

  