// Listen for the company ID sent from the main process
window.api.loadTransactions(async (companyId) => {
    try {
      const transactions = await window.api.getTransactions(companyId);
      renderTransactions(transactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  });
  
  // Render the transactions
  function renderTransactions(transactions) {
    const transactionsSection = document.getElementById('transactions');
    transactionsSection.innerHTML = ''; // Clear existing transactions

    if (!transactions || transactions.length === 0) {
        // Display a message if no transactions are found
        transactionsSection.innerHTML = '<p>No transactions found for this company.</p>';
        return;
      }
  
    // Create the table
  const table = document.createElement('table');
  table.className = 'transactions-table';

  // Table headers
  table.innerHTML = `
    <thead>
      <tr>
        <th>Transaction No</th>
        <th>Account Code</th>
        <th>Description</th>
        <th>Debit</th>
        <th>Credit</th>
      </tr>
    </thead>
    <tbody>
      ${transactions.map(transaction => `
        <tr>
          <td>${transaction.transaction_no}</td>
          <td>${transaction.account_code}</td>
          <td>${transaction.description}</td>
          <td>${transaction.debit}</td>
          <td>${transaction.credit}</td>
        </tr>
      `).join('')}
    </tbody>
  `;

  transactionsSection.appendChild(table);
  }
  