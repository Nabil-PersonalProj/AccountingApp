const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Path to main.db
const mainDbPath = path.join(__dirname, 'main.db');
console.log(mainDbPath);
const mainDb = new sqlite3.Database(mainDbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error("Error opening main.db:", err.message);
        process.exit(1);
    }
});

// Function to rename db_path to transactions_db_path
function renameColumn() {
    mainDb.serialize(() => {
        console.log("Renaming db_path to transactions_db_path...");

        // Step 1: Create a new table with the correct column names
        mainDb.run(`
            CREATE TABLE IF NOT EXISTS companies_temp (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                transactions_db_path TEXT NOT NULL,
                accounts_db_path TEXT NOT NULL
            )
        `, (err) => {
            if (err) {
                console.error("Error creating temporary table:", err);
                return;
            }

            console.log("Temporary table created successfully.");

            // Step 2: Copy data from old companies table
            mainDb.run(`
                INSERT INTO companies_temp (id, name, transactions_db_path, accounts_db_path)
                SELECT id, name, db_path, accounts_db_path FROM companies
            `, (err) => {
                if (err) {
                    console.error("Error copying data to new table:", err);
                    return;
                }

                console.log("Data copied successfully.");

                // Step 3: Drop old companies table
                mainDb.run(`DROP TABLE companies`, (err) => {
                    if (err) {
                        console.error("Error dropping old table:", err);
                        return;
                    }

                    console.log("Old table dropped.");

                    // Step 4: Rename new table to companies
                    mainDb.run(`ALTER TABLE companies_temp RENAME TO companies`, (err) => {
                        if (err) {
                            console.error("Error renaming new table:", err);
                        } else {
                            console.log("Table renamed successfully. Column is now transactions_db_path.");
                        }
                        mainDb.close(() => console.log("Database update complete."));
                    });
                });
            });
        });
    });
}

// Run the script
renameColumn();
