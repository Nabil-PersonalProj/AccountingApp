const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Define the paths
const companyDatabaseFolder = path.join(__dirname, 'company_database');
const outputFilePath = path.join(__dirname, 'account_codes.json');

// Get all database files in the company_database folder
const dbFiles = fs.readdirSync(companyDatabaseFolder).filter(file => file.endsWith('.db'));

// Function to extract unique account codes from each company database
function extractAccountCodes(dbPath, companyName) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(`Error opening database ${companyName}: ${err.message}`);
                return;
            }
        });

        const query = "SELECT DISTINCT account_code FROM transactions";

        db.all(query, [], (err, rows) => {
            db.close();
            if (err) {
                reject(`Error fetching accounts from ${companyName}: ${err.message}`);
                return;
            }

            const accountCodes = rows.map(row => row.account_code);
            resolve({ companyName, accountCodes });
        });
    });
}

// Function to process all company databases and save results to a file
async function processDatabases() {
    console.log("Extracting account codes from company databases...\n");
    const results = [];

    for (const file of dbFiles) {
        const dbPath = path.join(companyDatabaseFolder, file);
        const companyName = path.basename(file, '.db'); // Extracting company name from filename

        try {
            const result = await extractAccountCodes(dbPath, companyName);
            results.push(result);
        } catch (error) {
            console.error(error);
        }
    }

    // Save the results to a JSON file
    fs.writeFileSync(outputFilePath, JSON.stringify(results, null, 2));
    console.log(`Account codes saved to ${outputFilePath}`);
}

// Run the script
processDatabases();