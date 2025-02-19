const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Define the accounts database folder
const accountsDbFolder = path.join(__dirname, 'accounts_database');
if (!fs.existsSync(accountsDbFolder)) {
    fs.mkdirSync(accountsDbFolder);
}

// Define account type mapping
const accountTypeMapping = {
    "CA": "Asset",
    "CB": "Asset",
    "CL": "Liabilities",
    "EX": "Expense",
    "SC": "Equity",
    "SA": "Sales",
    "TD": "Debtors",
    "TC": "Creditors",
    "PL": "Profit/Loss"
};

// Define the accounts data
const accountsData = [
    { "companyName": "companytest", "accountCodes": ["CA101", "CL101"] },
    { "companyName": "company_a1", "accountCodes": [
        "CA101", "CA102", "CA103", "CB103", "CL103", "EX103", "SC103", "SA103",
        "TD103", "TC103", "CA106", "SA104", "EX104", "CB102", "CB106", "TD102",
        "EX106", "CA120", "EX110", "CL105", "CA104"
    ]},
    { "companyName": "company_b2", "accountCodes": [
        "CA101", "CA102", "CA103", "CB103", "CL103", "EX103", "SC103", "EX104",
        "CB102", "CA112", "EX120", "CL201", "EX301", "SA401", "TD501", "EX302",
        "PL601", "SC701", "CA110", "CA140", "CL120", "CL130", "EX130", "EX140",
        "CA120", "EX110", "CL140", "CL110"
    ]},
    { "companyName": "company_c3", "accountCodes": [
        "CA101", "CA102", "CA103", "CB103", "CL103", "EX103", "SC103", "SA103",
        "TD103", "TC103", "EX104", "CB102"
    ]},
    { "companyName": "viserio_2025_may", "accountCodes": [
        "CB1", "SC1", "CA4", "EX1", "EX3", "CL2", "SA1", "TD1", "SA2"
    ]}
];

// Function to create and populate an accounts database
function createAccountsDb(companyName, accountCodes) {
    const dbPath = path.join(accountsDbFolder, `${companyName}_accounts.db`);
    const db = new sqlite3.Database(dbPath);

    db.serialize(() => {
        // Create accounts table
        db.run(`
            CREATE TABLE IF NOT EXISTS accounts (
                account_code TEXT PRIMARY KEY,
                account_name TEXT NOT NULL,
                account_type TEXT NOT NULL
            )
        `);

        // Insert accounts with generic names and mapped account types
        const stmt = db.prepare("INSERT OR IGNORE INTO accounts (account_code, account_name, account_type) VALUES (?, ?, ?)");
        accountCodes.forEach(code => {
            const prefix = code.match(/^[A-Za-z]+/)[0];  // Extract letters from account_code
            const accountType = accountTypeMapping[prefix] || "Unknown";
            const accountName = `Account ${code}`;  // Generic name
            stmt.run(code, accountName, accountType);
        });
        stmt.finalize();
    });

    db.close();
    console.log(`Created database: ${dbPath}`);
}

// Process each company and create its accounts database
accountsData.forEach(company => {
    createAccountsDb(company.companyName, company.accountCodes);
});

console.log("All company account databases have been created.");