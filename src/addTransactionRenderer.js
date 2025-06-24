let currentCompanyId = null; // Store the company ID

// Receive company ID and initialize the add transaction window
window.api.receive('initialize-add-transaction', async (companyId) => {
    try {
        console.log('[addTransactionRenderer] Initializing Add Transaction Window for Company ID:', companyId);
        currentCompanyId = companyId;

        // Get DOM elements safely
        const transactionNoElement = document.getElementById('transactionNo');
        const transactionDateElement = document.getElementById('transactionDate');
        const warningElement = document.getElementById('addBalanceWarning');

        if (!transactionNoElement || !transactionDateElement) {
            console.error("Error: Missing required form elements.");
            return;
        }

        // Set transaction number
        const lastTransaction = await window.api.getLastTransaction(companyId);
        const nextTransactionNo = lastTransaction ? lastTransaction.transaction_no + 1 : 1;
        transactionNoElement.value = nextTransactionNo;

        // Set current date
        transactionDateElement.value = new Date().toISOString().split('T')[0];

        // Reset transaction rows
        document.getElementById('transactionRows').innerHTML = '';

        // Hide balance warning safely
        if (warningElement) {
            warningElement.textContent = '';
            warningElement.style.display = 'none';
        }
    } catch (error) {
        console.error('Error initializing transaction window:', error);
    }
});

// Add a new row to the transactions table
async function addTransactionRow() {
    if (!currentCompanyId) {
        console.error("Company ID is missing.");
        return;
    }

    const accountCodes = await fetchAccountCodes(currentCompanyId);
    if (accountCodes.length === 0) {
        window.api.showMessage("No accounts available. Please add accounts first.");
        return;
    }

    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td>
            <select class="accountCode" required>
                <option value="">Select Account</option>
                ${accountCodes.map(code => `<option value="${code}">${code}</option>`).join("")}
            </select>
        </td>
        <td><input type="text" class="description" placeholder="Description" ></td>
        <td><input type="number" class="debit" step="0.01" placeholder="0.00"></td>
        <td><input type="number" class="credit" step="0.01" placeholder="0.00"></td>
        <td><button class="remove-row-btn">🗑️</button></td>
    `;

    document.getElementById("transactionRows").appendChild(newRow);
}

// Fetch account codes for the current company
async function fetchAccountCodes(companyId) {
    try {
        const accounts = await window.api.getAccounts(companyId);
        return accounts.map(a => a.account_code);
    } catch (error) {
        console.error("Error fetching account codes:", error);
        return [];
    }
}

// Add row button listener
document.getElementById('addRowBtn').addEventListener('click', addTransactionRow);

// Remove a row from the transactions table
document.addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-row-btn')) {
        event.target.closest('tr').remove();
    }
});

// Save transactions from the form
document.getElementById('saveTransactionBtn').addEventListener('click', async () => {
    if (!currentCompanyId) {
        console.error("Company ID is missing.");
        return;
    }

    const transactionNoElement = document.getElementById('transactionNo');
    const transactionDateElement = document.getElementById('transactionDate');
    const warningElement = document.getElementById('addBalanceWarning');

    if (!transactionNoElement || !transactionDateElement) {
        console.error("Error: Missing required form elements.");
        return;
    }

    const transactionNo = transactionNoElement.value;
    const transactionDate = transactionDateElement.value;

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

        // Validate that total debits and credits match
        const totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0);
        const totalCredit = transactions.reduce((sum, t) => sum + t.credit, 0);
        const addDifference = Math.abs(totalDebit - totalCredit);

        if (warningElement) {
            if (totalDebit !== totalCredit) {
                warningElement.textContent = `Total Debit (${totalDebit}) is not equal to Total Credit (${totalCredit}). Difference: ${addDifference}. Please adjust transactions.`;
                warningElement.style.display = 'block';
                return;
            } else {
                warningElement.style.display = 'none';
            }
        }

        // Save transaction
        await window.api.addTransaction(currentCompanyId, transactions);
        window.api.showMessage('Transaction added successfully!');

        window.api.send('refresh-page', currentCompanyId);

        window.close();
    } catch (error) {
        console.error('Error saving transactions:', error);
        window.api.showMessage('Failed to save transactions.');
    }
});

// Close the window on cancel
document.getElementById('cancelTransactionBtn').addEventListener('click', () => {
    window.api.send('refresh-page', currentCompanyId);
    window.close();
});

function syncDescriptions(inputField) {
    const enteredDescription = inputField.value;

    // Get all description fields
    const allDescriptions = document.querySelectorAll('.description');

    // Update all other descriptions in real-time
    allDescriptions.forEach(descField => {
        if (descField !== inputField) {
            descField.value = enteredDescription;
        }
    });
}

document.addEventListener('input', (event) => {
    if (event.target.classList.contains('description')) {
        const newValue = event.target.value;
        document.querySelectorAll('.description').forEach(input => input.value = newValue);
    }
});

