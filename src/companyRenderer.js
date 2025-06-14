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
  
  let currentCompanyId = null;
  let isCarryForwardToNewCompany = false;
  let carryForwardSourceCompanyId = null;
  
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

    window.api.receive('initiate-carry-forward-to-new-company', async () => {
      if (!currentCompanyId) {
        return window.api.showMessage('No active company to carry forward from.');
      }
    
      isCarryForwardToNewCompany = true;
      carryForwardSourceCompanyId = currentCompanyId;
    
      // Reuse existing flow to open add company window
      window.api.openAddCompanyWindow();
    });

    window.api.receive('carry-forward-after-company-created', async (newCompanyId) => {
      if (!isCarryForwardToNewCompany || !carryForwardSourceCompanyId) {
        console.log("[Carry Forward] Not triggered via carry forward flow.");
        return; // This wasn't a carry forward operation
      }
    
      try {
        console.log(`[Carry Forward] Starting from company ID: ${carryForwardSourceCompanyId} to new company ID: ${newCompanyId}`);
        const [sourceAccounts, plReport] = await Promise.all([
          window.api.getAccounts(carryForwardSourceCompanyId),
          window.api.getProfitLossSummary(carryForwardSourceCompanyId)
        ]);

        console.log("[Carry Forward] Accounts and P&L Report fetched.");
    
        const plAccountsToCarry = plReport.profitLoss.filter(a =>
          parseFloat(a.totalDebit || 0) !== 0 || parseFloat(a.totalCredit || 0) !== 0
        );

        console.log(`[Carry Forward] Found ${plAccountsToCarry.length} P&L accounts to carry.`);
    
        const clonedAccounts = sourceAccounts.map(acc => ({
          account_code: acc.account_code,
          account_name: acc.account_name,
          account_type: acc.account_type
        }));

        console.log(`[Carry Forward] Cloning ${clonedAccounts.length} accounts.`);
    
        // Step 1: Create all accounts in the new company
        for (const acc of clonedAccounts) {
          console.log(`[Carry Forward] Adding account: ${acc.account_code}`);
          await window.api.addAccount(newCompanyId, acc.account_code, acc.account_name, acc.account_type);
        }
    
        // Step 2: Prepare carry forward transaction
        const carryForwardTransaction = plAccountsToCarry.map(account => {
          console.log(`[Carry Forward] Preparing transaction for ${account.account_code} with balance ${balance}`);
          const balance = (account.totalCredit || 0) - (account.totalDebit || 0);
          return {
            transaction_no: 1,
            date: new Date().toISOString().split('T')[0],
            account_code: account.account_code,
            description: "Carried forward from previous company",
            debit: balance < 0 ? Math.abs(balance) : 0,
            credit: balance > 0 ? balance : 0
          };
        });
        
        console.log("[Carry Forward] Adding initial transaction...");
        await window.api.addTransaction(newCompanyId, carryForwardTransaction);

        console.log("[Carry Forward] Success! Opening new company...");
        window.api.showMessage("Carry forward completed and new company initialized!");
    
      } catch (err) {
        console.error("[Carry Forward] Error:", err);
        window.api.showMessage("An error occurred while carrying forward to new company.");
      } finally {
        // Reset the flags
        isCarryForwardToNewCompany = false;
        carryForwardSourceCompanyId = null;
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
      // 1. Filter out the “No accounts available” row
      const allRows = Array.from(
        document.querySelectorAll('#accountManagerBody tr')
      );
      const inputRows = allRows.filter(row =>
        row.querySelector('.account-code')
      );

      // 2. Prepare our diff buckets
      const newAccounts = [];
      const modifiedAccounts = [];
      const seenCodes = new Set();

      // 3. Loop & validate
      for (const row of inputRows) {
        const codeInput = row.querySelector('.account-code');
        const nameInput = row.querySelector('.account-name');
        const typeInput = row.querySelector('.account-type');

        const code = codeInput.value.trim();
        const name = nameInput.value.trim();
        const type = typeInput.value.trim();

        if (!code || !name || !type) {
          return window.api.showMessage('All fields are required!');  
        }
        if (seenCodes.has(code)) {
          return window.api.showMessage(
            `Duplicate account code: ${code}. Please use unique codes.`
          );
        }
        seenCodes.add(code);

        if (row.classList.contains('new-account-row')) {
          newAccounts.push({ account_code: code, account_name: name, account_type: type });
        } else {
          const original = window.originalAccounts.find(a => a.account_code === row.dataset.accountId);
          if (
            original.account_name !== name ||
            original.account_type !== type ||
            original.account_code !== code
          ) {
            modifiedAccounts.push({ account_code: code, account_name: name, account_type: type });
          }
        }
      }

      // 4. Figure out which originals got deleted
      const deletedAccounts = window.originalAccounts
        .filter(a => !seenCodes.has(a.account_code));

      try {
        // 5a. Add new ones: (companyId, code, name, type) :contentReference[oaicite:0]{index=0}:contentReference[oaicite:1]{index=1}
        await Promise.all(
          newAccounts.map(acc =>
            window.api.addAccount(
              currentCompanyId,
              acc.account_code,
              acc.account_name,
              acc.account_type
            )
          )
        );

        // 5b. Update modified: (companyId, [ { account_code, account_name, account_type }, … ]) :contentReference[oaicite:2]{index=2}:contentReference[oaicite:3]{index=3}
        if (modifiedAccounts.length) {
          await window.api.updateAccounts(currentCompanyId, modifiedAccounts);
        }

        // 5c. Delete removed: (companyId, accountCode) :contentReference[oaicite:4]{index=4}:contentReference[oaicite:5]{index=5}
        await Promise.all(
          deletedAccounts.map(acc =>
            window.api.deleteAccount(currentCompanyId, acc.account_code)
          )
        );

        // 6. Feedback & refresh
        window.api.showMessage('Account changes saved successfully!');
        document.getElementById('accountManagerModal').style.display = 'none';
        refresh(currentCompanyId);

      } catch (err) {
        console.error('Error saving account changes:', err);
        window.api.showMessage('An error occurred. Please try again.');
      }
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
  try {
    const companyId = await window.api.getActiveCompanyId();

    if (!companyId) {
      window.api.showMessage("Company ID is missing.");
      return;
    }

    const accounts = await window.api.getAccounts(companyId);

    if (!accounts || accounts.length === 0) {
      window.api.showMessage("No accounts available to export.");
      return;
    }

    const groupedAccounts = {};
    accounts.forEach(account => {
      if (!groupedAccounts[account.account_type]) {
        groupedAccounts[account.account_type] = [];
      }
      groupedAccounts[account.account_type].push(account);
    });

    const report = [];

    Object.entries(groupedAccounts).forEach(([type, list]) => {
      report.push({ section: type, isHeader: true });
      list.forEach(account => {
        report.push({
          account_code: account.account_code,
          account_name: account.account_name,
          account_type: type,
          debit: parseFloat(account.debit || 0).toFixed(2),
          credit: parseFloat(account.credit || 0).toFixed(2),
        });
      });
    });

    // ✅ Send the processed report array to the main process
    window.api.send('export-trial-balance-csv', report);

  } catch (error) {
    console.error("Error exporting Trial Balance:", error);
    window.api.showMessage("Export failed.");
  }
});

window.api.receive('request-export-transactions', async () => {
  try {
    const companyId = await window.api.getActiveCompanyId();

    if (!companyId) {
      window.api.showMessage("Company ID is missing.");
      return;
    }

    const transactions = await window.api.getTransactions(companyId);

    if (!transactions || transactions.length === 0) {
      window.api.showMessage("No transactions available to export.");
      return;
    }

    // Group by transaction_no
    const grouped = transactions.reduce((acc, t) => {
      if (!acc[t.transaction_no]) acc[t.transaction_no] = [];
      acc[t.transaction_no].push(t);
      return acc;
    }, {});

    const exportRows = [];

    Object.entries(grouped).forEach(([transactionNo, txns]) => {
      exportRows.push({ isHeader: true, label: `Transaction No: ${transactionNo}` });

      txns.forEach(t => {
        exportRows.push({
          date: t.date,
          transaction_no: t.transaction_no,
          account_code: t.account_code,
          description: t.description,
          debit: parseFloat(t.debit || 0).toFixed(2),
          credit: parseFloat(t.credit || 0).toFixed(2),
        });
      });
    });

    window.api.send('export-transactions-csv', exportRows);

  } catch (error) {
    console.error("Error exporting transactions:", error);
    window.api.showMessage("Export failed.");
  }
});

  