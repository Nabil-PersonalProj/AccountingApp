const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Paths
const mainDbPath = path.join(__dirname, 'main.db');

// Main database setup
const mainDb = new sqlite3.Database(mainDbPath);

const companyId = 3;

const transactions = [
    { transaction_no: 2, account_code: 'EX104', description: 'Expense example', debit: 2300, credit: 0, date: '2024-12-01', account_type: 'expense' },
    { transaction_no: 3, account_code: 'CB102', description: 'Asset Example', debit: 0, credit: 600, date: '2024-12-03', account_type: 'asset' },
];

async function correcting_transactions(companyId) {
    return new Promise((resolve, reject) => {
        // Get the database path for the specified company ID
        mainDb.get(`SELECT db_path FROM companies WHERE id = ?`, [companyId], (err, row) => {
            if (err) {
                return reject(`Error fetching db_path for company ID ${companyId}: ${err.message}`);
            }
            if (!row) {
                return reject(`No company found with ID ${companyId}`);
            }

            const companyDbPath = path.join(__dirname, row.db_path);

            // Open the company's database
            const companyDb = new sqlite3.Database(companyDbPath);

            // Start a transaction
            companyDb.serialize(() => {
                // Iterate through the transactions array
                transactions.forEach(transaction => {
                    companyDb.run(
                        `INSERT INTO transactions (transaction_no, account_code, description, debit, credit, date, account_type)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [
                            transaction.transaction_no,
                            transaction.account_code,
                            transaction.description,
                            transaction.debit,
                            transaction.credit,
                            transaction.date,
                            transaction.account_type,
                        ],
                        (err) => {
                            if (err) {
                                console.error(`Error inserting transaction_no ${transaction.transaction_no}: ${err.message}`);
                            }
                        }
                    );
                });
            });

            // Close the company's database after the transaction
            companyDb.close((err) => {
                if (err) {
                    return reject(`Error closing company database: ${err.message}`);
                }
                resolve(`Transactions added successfully for company ID ${companyId}`);
            });
        });
    });
}

// Usage Example
correcting_transactions(companyId)
    .then((message) => console.log(message))
    .catch((error) => console.error(error));
