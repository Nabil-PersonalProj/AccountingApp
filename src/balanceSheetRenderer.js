let currentCompanyId = null;

window.api.receive('load-balance-sheet', async (companyId) => {
  currentCompanyId = companyId;
  window.logging.info('[balanceSheetRenderer] Creating balance sheet');

  try {
    const accounts = await window.api.getAccounts(companyId);
    const transactions = await window.api.getTransactions(companyId);

    const accountMap = {};
    accounts.forEach(acc => {
      accountMap[acc.account_code] = acc;
    });

    const getBalance = (code) => {
      const txns = transactions.filter(t => t.account_code === code);
      const debit = txns.reduce((sum, t) => sum + (t.debit || 0), 0);
      const credit = txns.reduce((sum, t) => sum + (t.credit || 0), 0);
      return credit - debit;
    };

    const sections = {
      shareCapital: [],
      profitLoss: [],
      fixedAssets: [],
      depreciation: [],
      currentAssets: [],
      currentLiabilities: []
    };

    for (const account of accounts) {
      const balance = getBalance(account.account_code);

      switch (account.account_type) {
        case "Equity":
          sections.shareCapital.push({ ...account, balance });
          break;
        case "Profit & Loss":
          sections.profitLoss.push({ ...account, balance });
          break;
        case "Fixed Asset":
          sections.fixedAssets.push({ ...account, balance });
          break;
        case "Accumulated Depreciation":
          sections.depreciation.push({ ...account, balance });
          break;
        case "Asset":
        case "Debtor":
          sections.currentAssets.push({ ...account, balance });
          break;
        case "Liabilities":
        case "Creditor":
          sections.currentLiabilities.push({ ...account, balance });
          break;
      }
    }

    renderBalanceSheet(sections);

  } catch (err) {
    window.logging.console.error("Error generating balance sheet:", err);
    window.api.showMessage("Failed to load balance sheet.");
  }
});

function formatAmount(value, expectedSide = "debit") {
  const isNegativeOnWrongSide =
    (expectedSide === "debit" && value < 0) ||
    (expectedSide === "credit" && value < 0);

  if (isNegativeOnWrongSide) {
    return `<span class="negative">(${Math.abs(value).toFixed(2)})</span>`;
  }

  return value.toFixed(2);
}

function appendSection(title, items, expectedSide = "debit") {
  const tbody = document.getElementById("balance-body");
  const headerRow = document.createElement("tr");
  headerRow.classList.add("section-header");
  headerRow.innerHTML = `<td colspan="3">${title}</td>`;
  tbody.appendChild(headerRow);

  let total = 0;
  items.forEach(item => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.account_code}</td>
      <td>${item.account_name}</td>
      <td>${formatAmount(item.balance, expectedSide)}</td>
    `;
    tbody.appendChild(row);
    total += item.balance;
  });

  const totalRow = document.createElement("tr");
  totalRow.innerHTML = `<td colspan="2"><strong>Total ${title}</strong></td><td><strong>${formatAmount(total)}</strong></td>`;
  tbody.appendChild(totalRow);

  return total;
}

function renderBalanceSheet(sections) {
  const body = document.getElementById("balance-body");
  body.innerHTML = ""; // Clear existing content

  const totalShareCapital = appendSection("Share Capital", sections.shareCapital, "credit");
  const totalPL = appendSection("Profit & Loss", sections.profitLoss, "credit");
  const P = totalShareCapital + totalPL;

  const netFixedAssets = sections.fixedAssets.map(asset => {
    const dep = sections.depreciation.find(d => d.account_code.endsWith(asset.account_code));
    const depValue = dep ? dep.balance : 0;
    return {
      ...asset,
      balance: asset.balance - depValue
    };
  });
  const A = appendSection("Fixed Assets (Net)", netFixedAssets, "debit");

  const B = appendSection("Current Assets", sections.currentAssets, "debit");
  const C = appendSection("Current Liabilities", sections.currentLiabilities, "credit");
  const D = B - C;

  const validation = document.getElementById("validation");
  const totalLeft = A + D;
  const pass = Math.abs(totalLeft - P) < 0.01;

  validation.innerHTML = `
    <p>Net Current Assets (B - C): <strong>${formatAmount(D)}</strong></p>
    <p>A + D: <strong>${formatAmount(totalLeft)}</strong> | P: <strong>${formatAmount(P)}</strong></p>
    <p style="color: ${pass ? 'green' : 'red'}"><strong>${pass ? 'Balanced ✅' : 'Not Balanced ❌'}</strong></p>
  `;
}
