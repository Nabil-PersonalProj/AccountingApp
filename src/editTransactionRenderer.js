let currentCompanyId = null;
let transactionNo = null;
let originalTransactionSnapshot = [];

// Receive the transaction number and load data
window.api.receive('initialize-edit-transaction', async (companyId, txnNo) => {
    try {
        console.log('🚀 Received Edit Request for Company ID:', companyId, 'Transaction No:', txnNo);

        if (!txnNo || isNaN(txnNo)) {
            console.error("❌ Invalid Transaction No received in Edit Window:", txnNo);
            window.api.showMessage("Invalid transaction number received. Please try again.");
            return;
        }

        currentCompanyId = companyId;
        transactionNo = txnNo;

        document.getElementById('editTransactionNo').textContent = txnNo;

        const transactions = await window.api.getTransactions(companyId);
        console.log("📄 Transactions fetched from DB:", transactions);

        // **Filter transactions by the transaction number**
        const filteredTransactions = transactions.filter(t => Number(t.transaction_no) === Number(txnNo));
        console.log("🔍 Filtered Transactions:", filteredTransactions);

        if (filteredTransactions.length === 0) {
            console.warn('❌ No transactions found for Transaction No:', txnNo);
            window.api.showMessage('No transactions found for the given transaction number.');
            return;
        }

        originalTransactionSnapshot = JSON.parse(JSON.stringify(filteredTransactions));

        document.getElementById('editTransactionDate').value = filteredTransactions[0].date;
        populateEditTable(filteredTransactions);
    } catch (error) {
        console.error('Error initializing edit transaction window:', error);
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

// ** Populate the edit transaction table **
async function populateEditTable(transactions) {
    console.log("Populating Edit Table with:", transactions);
    const tableBody = document.getElementById('editTransactionRows');
    tableBody.innerHTML = '';

    const accountCodes = await fetchAccountCodes(currentCompanyId);

    if (accountCodes.length === 0) {
        window.api.showMessage("No accounts available. Please add accounts first.");
        return;
    }

    transactions.forEach(t => {
        const newRow = document.createElement('tr');
        newRow.dataset.transactionId = t.transaction_id;
        newRow.innerHTML = `
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
        `;
        tableBody.appendChild(newRow);
    });
}

// ** Add a new row **
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
        <td><button class="remove-edit-row-btn">🗑️</button></td>
    `;

    document.getElementById("editTransactionRows").appendChild(newRow);
}

document.getElementById("addEditRowBtn").addEventListener("click", addEditTransactionRow);

// ** Remove a row **
document.addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-edit-row-btn')) {
        event.target.closest('tr').remove();
    }
});

// ** Save edited transactions **
document.getElementById('saveEditTransactionBtn').addEventListener('click', async () => {
    console.log("🔄 Save button clicked - Processing update...");

    const rows = Array.from(document.querySelectorAll('#editTransactionRows tr'));
    const selectedDate = document.getElementById('editTransactionDate').value;

    if (!selectedDate) {
        window.api.showMessage("Transaction date is required.");
        return;
    }

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

    console.log("📝 Updated Transactions:", updatedTransactions);

    // Validate that total debits and credits match
    const totalDebit = updatedTransactions.reduce((sum, t) => sum + t.debit, 0);
    const totalCredit = updatedTransactions.reduce((sum, t) => sum + t.credit, 0);
    const editDifference = Math.abs(totalDebit - totalCredit);

    const warningElement = document.getElementById('editBalanceWarning');
    if (totalDebit !== totalCredit) {
        warningElement.textContent = `Total Debit (${totalDebit}) is not equal to Total Credit (${totalCredit}). Difference: ${editDifference}. Please adjust transactions.`;
        warningElement.style.display = 'block';
        console.warn("⚠ Balance mismatch - Save operation stopped.");
        return;
    } else {
        warningElement.style.display = 'none';
    }

    console.log("✅ Balance check passed, proceeding with update...");

    // Categorize transactions: added, modified, and deleted
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

    // If no changes detected, exit early
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
        console.log("✅ Transaction update successful!");

        window.api.showMessage('Transactions updated successfully!');
        window.api.send('transaction-added', currentCompanyId);
        window.api.send('refresh-page', currentCompanyId);
        window.close();
    } catch (error) {
        console.error("❌ Error saving transactions:", error);
        window.api.showMessage('Failed to save transactions.');
    }
});


// ** Close the Edit Transaction window **
document.getElementById('cancelEditTransactionBtn').addEventListener('click', () => {
    window.api.send('refresh-page', currentCompanyId);
    window.close();
});

document.addEventListener('input', (event) => {
    if (event.target.classList.contains('description')) {
        const newValue = event.target.value;
        document.querySelectorAll('.description').forEach(input => input.value = newValue);
    }
});

