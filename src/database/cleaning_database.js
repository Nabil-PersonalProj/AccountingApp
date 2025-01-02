const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Paths
const mainDbPath = path.join(__dirname, 'main.db');

// Main database setup
const mainDb = new sqlite3.Database(mainDbPath);

async function deleteRow(companyId, transactionNo) {
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

            // Execute the DELETE statement
            companyDb.run(`DELETE FROM transactions WHERE transaction_no = ?`, [transactionNo], function (err) {
                if (err) {
                    return reject(`Error deleting transaction: ${err.message}`);
                }

                if (this.changes === 0) {
                    return reject(`No transaction found with transaction number ${transactionNo}`);
                }

                resolve(`Transaction ${transactionNo} deleted successfully.`);
            });

            companyDb.close();
        });
    });
}

// Usage Example
deleteRow(3, 4) // Replace with actual companyId and transactionNo
    .then((message) => console.log(message))
    .catch((error) => console.error(error));