const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Define the path to main.db
const mainDbPath = path.join(__dirname, '../database/main.db'); // Adjusted path if needed
console.log(mainDbPath);
const mainDb = new sqlite3.Database(mainDbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error("Error opening main.db:", err.message);
        process.exit(1);
    }
});

// Function to check if accounts_db_path exists
function checkAndAlterTable() {
    return new Promise((resolve, reject) => {
        mainDb.all("PRAGMA table_info(companies);", (err, columns) => {
            if (err) return reject(err);

            const columnNames = columns.map(col => col.name);
            if (!columnNames.includes("accounts_db_path")) {
                console.log("Adding accounts_db_path column...");
                mainDb.run("ALTER TABLE companies ADD COLUMN accounts_db_path TEXT;", (alterErr) => {
                    if (alterErr) return reject(alterErr);
                    console.log("accounts_db_path column added successfully.");
                    resolve();
                });
            } else {
                console.log("accounts_db_path column already exists.");
                resolve();
            }
        });
    });
}

// Function to update existing records
function updateExistingRecords() {
    return new Promise((resolve, reject) => {
        mainDb.all("SELECT id, name FROM companies;", (err, rows) => {
            if (err) return reject(err);

            if (rows.length === 0) return resolve();

            let updatesCompleted = 0;
            rows.forEach(row => {
                const companyName = row.name.replace(/\s+/g, '_').toLowerCase();
                const accountsDbPath = `company_accounts/${companyName}_accounts.db`;

                mainDb.run(
                    "UPDATE companies SET accounts_db_path = ? WHERE id = ?;",
                    [accountsDbPath, row.id],
                    (updateErr) => {
                        if (updateErr) console.error(`Error updating ${row.name}:`, updateErr);
                        updatesCompleted++;
                        if (updatesCompleted === rows.length) resolve();
                    }
                );
            });
        });
    });
}

// Execute table correction and update records
async function fixMainDb() {
    try {
        await checkAndAlterTable();
        await updateExistingRecords();
        console.log("Database update complete.");
    } catch (error) {
        console.error("Error updating main.db:", error);
    } finally {
        setTimeout(() => {
            mainDb.close(() => console.log("Database connection closed."));
        }, 500); // Ensures all queries finish before closing
    }
}

// Run the script
fixMainDb();
