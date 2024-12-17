window.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab-button');
  const sections = document.querySelectorAll('.tab-content');
  let currentCompanyId = null;

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
    accountsBody.innerHTML = accounts.map(a => `
      <tr>
        <td>${a.account_code}</td>
        <td>${a.description}</td>
        <td>${a.debit}</td>
        <td>${a.credit}</td>
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
