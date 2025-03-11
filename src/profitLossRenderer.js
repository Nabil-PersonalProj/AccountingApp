window.api.receive('load-profit-loss', async (companyId) => {
    try {
        console.log("Loading Profit & Loss for Company ID:", companyId);

        // Fetch all accounts and transactions
        const accounts = await window.api.getAccounts(companyId);
        const transactions = await window.api.getTransactions(companyId);

        // console.log("Fetched Accounts:", accounts);
        // console.log("Fetched Transactions:", transactions);
        
        const allAccounts = accounts.map(account => {
            const accountTransations = transactions.filter(t => t.account_code === account.account_code);

            let totalDebit = accountTransations.reduce((sum, t) => sum + (t.debit || 0), 0);
            let totalCredit = accountTransations.reduce((sum, t) => sum + (t.credit || 0), 0);

            const reBalance = totalCredit - totalDebit;

            if (reBalance > 0) {
                totalCredit = reBalance;
                totalDebit = 0;
            } else {
                totalDebit = reBalance;
                totalCredit = 0;
            }

            return {
                account_code: account.account_code,
                account_name: account.account_name,
                account_type: account.account_type,
                totalDebit: totalDebit,
                totalCredit: totalCredit
            };
        })

        console.log("All accounts table: ", allAccounts);

        const report = {
            sales: [],
            costOfSales: [],
            expenses: [],
            profitLoss: [],
            totals: { sales: 0, costOfSales: 0, expenses: 0, profitLoss: 0 }
        }

        // Process All Accounts Data and Categorize Them
        allAccounts.forEach(account => {

            switch (account.account_type) {
                case 'Sales':
                    report.sales.push(account);
                    report.totals.sales += account.totalCredit;
                    report.totals.sales += account.totalDebit;
                    break;
                case 'Cost of Sale':
                    report.costOfSales.push(account);
                    report.totals.costOfSales += account.totalDebit;
                    report.totals.costOfSales += account.totalCredit;
                    break;
                case 'Expense':
                    report.expenses.push(account);
                    report.totals.expenses += account.totalDebit;
                    report.totals.expenses += account.totalCredit; 
                    break;
                case 'Profit & Loss':
                    report.profitLoss.push(account);
                    report.totals.profitLoss += account.totalDebit;
                    report.totals.profitLoss += account.totalCredit;
                    break;
            }
        });

        // Calculate Gross Profit
        report.totals.grossProfit = report.totals.sales + report.totals.costOfSales;

        // Calculate Final Profit
        report.totals.finalProfit = report.totals.grossProfit + report.totals.expenses;

        // Calculate P&L Carried Forward
        report.totals.plCarriedForward = report.totals.finalProfit + report.totals.profitLoss;

        // Log calculated values for debugging
        console.log("📊 Sales:", report.totals.sales);
        console.log("📊 Cost of Sales:", report.totals.costOfSales);
        console.log("📊 Gross Profit:", report.totals.grossProfit);
        console.log("📊 Expenses:", report.totals.expenses);
        console.log("📊 Final Profit:", report.totals.finalProfit);
        console.log("📊 Profit & Loss (Brought Down):", report.totals.profitLoss);
        console.log("📊 P&L Carried Forward:", report.totals.plCarriedForward);

        function formatAmount(value) {
            if (value < 0) {
                return `<span class="negative">(${Math.abs(value).toFixed(2)})</span>`;
            }
            return value.toFixed(2);
        }

        const plBody = document.getElementById('pl-body');

        // Clear previous data
        plBody.innerHTML = "";

        // Function to append sections dynamically
        function appendSection(title, accounts, totalValue) {
            const sectionRow = document.createElement('tr');
            sectionRow.innerHTML = `<td colspan="3"><strong>${title}</strong></td>`;
            plBody.appendChild(sectionRow);

            accounts.forEach(account => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${account.account_code}</td>
                    <td>${account.account_name}</td>
                    <td>${formatAmount(account.totalCredit + account.totalDebit)}</td>
                `;
                plBody.appendChild(row);
            });

            // Append the total row only if it's not "PL1 Balance Brought Down"
            if (title !== "Balance Brought Down") {
                const totalRow = document.createElement('tr');
                totalRow.innerHTML = `<td colspan="2"><strong>Total ${title}:</strong></td><td>${formatAmount(totalValue)}</td>`;
                plBody.appendChild(totalRow);
            }
        }

        // Append each section
        appendSection("Sales", report.sales, report.totals.sales);
        appendSection("Cost of Sales", report.costOfSales, report.totals.costOfSales);

        // Gross Profit Calculation
        const grossProfitRow = document.createElement('tr');
        grossProfitRow.innerHTML = `<td colspan="2"><strong>Gross Profit:</strong></td><td>${formatAmount(report.totals.grossProfit)}</td>`;
        plBody.appendChild(grossProfitRow);

        appendSection("Expenses", report.expenses, report.totals.expenses);

        // Final Profit Calculation
        const finalProfitRow = document.createElement('tr');
        finalProfitRow.innerHTML = `<td colspan="2"><strong>Final Profit:</strong></td><td>${formatAmount(report.totals.finalProfit)}</td>`;
        plBody.appendChild(finalProfitRow);

        // Display "PL1 Balance Brought Down" as a single row
        const balanceBroughtDownRow = document.createElement('tr');
        balanceBroughtDownRow.innerHTML = `<td>${report.profitLoss[0].account_code}</td><td>${report.profitLoss[0].account_name}</td><td>${formatAmount(report.profitLoss[0].totalDebit + report.profitLoss[0].totalCredit)}</td>`;
        plBody.appendChild(balanceBroughtDownRow);

        // P&L Carried Forward Calculation
        const plCarriedForwardRow = document.createElement('tr');
        plCarriedForwardRow.innerHTML = `<td colspan="2"><strong>P&L Carried Forward:</strong></td><td>${formatAmount(report.totals.plCarriedForward)}</td>`;
        plBody.appendChild(plCarriedForwardRow);

    } catch (error) {
        console.error("Error loading Profit & Loss report:", error);
    }
});
