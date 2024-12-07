const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure the `database/` folder exists
const databaseFolder = path.join(__dirname, 'database');
if (!fs.existsSync(databaseFolder)) {
  fs.mkdirSync(databaseFolder);
}

// Paths
const mainDbPath = path.join(__dirname, 'main.db');

// Main database setup
const mainDb = new sqlite3.Database(mainDbPath);

// Sample companies and transactions
const sampleCompanies = [
  { name: 'Company A' },
  { name: 'Company B' },
  { name: 'Company C' },
];

const sampleTransactions = [
  { transaction_no: 1, account_code: 'AC101', description: 'Initial Deposit', debit: 1000, credit: 0 },
  { transaction_no: 2, account_code: 'AC102', description: 'Purchase Materials', debit: 0, credit: 300 },
  { transaction_no: 3, account_code: 'AC103', description: 'Service Revenue', debit: 500, credit: 0 },
];

// Initialize the main database
async function initializeMainDb() {
  return new Promise((resolve, reject) => {
    mainDb.serialize(() => {
      mainDb.run(
        `
        CREATE TABLE IF NOT EXISTS companies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          db_path TEXT NOT NULL
        )
      `,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  });
}

// Add a company and initialize its database
async function addCompany(name) {
  return new Promise((resolve, reject) => {
    const relativeDbPath = `Com_database/${name.replace(/\s+/g, '_').toLowerCase()}.db`;
    const absoluteDbPath = path.join(__dirname, relativeDbPath);

    // Add company to the main database
    const insertStmt = mainDb.prepare(`INSERT INTO companies (name, db_path) VALUES (?, ?)`);
    insertStmt.run(name, relativeDbPath, (err) => {
      if (err) {
        insertStmt.finalize();
        return reject(err);
      }

      // Initialize the company's database immediately
      initializeCompanyDb(absoluteDbPath)
        .then(() => {
          insertStmt.finalize();
          resolve(`Company "${name}" added and database initialized.`);
        })
        .catch((error) => {
          insertStmt.finalize();
          reject(error);
        });
    });
  });
}

// Initialize a company's database with the `transactions` table
function initializeCompanyDb(dbPath) {
  return new Promise((resolve, reject) => {
    const companyDb = new sqlite3.Database(dbPath);
    companyDb.serialize(() => {
      companyDb.run(
        `
        CREATE TABLE IF NOT EXISTS transactions (
          transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
          transaction_no INTEGER,
          account_code TEXT NOT NULL,
          description TEXT,
          debit REAL DEFAULT 0,
          credit REAL DEFAULT 0
        )
      `,
        (err) => {
          if (err) {
            companyDb.close();
            return reject(err);
          }

          // Populate the company's database with sample transactions
          populateCompanyDb(companyDb)
            .then(() => {
              companyDb.close();
              resolve(`Database initialized at ${dbPath}`);
            })
            .catch((error) => {
              companyDb.close();
              reject(error);
            });
        }
      );
    });
  });
}

// Populate company-specific databases with sample transactions
async function populateCompanyDb(companyDb) {
  return new Promise((resolve, reject) => {
    const insertStmt = companyDb.prepare(`
      INSERT INTO transactions (transaction_no, account_code, description, debit, credit)
      VALUES (?, ?, ?, ?, ?)
    `);

    sampleTransactions.forEach((transaction) => {
      insertStmt.run(
        transaction.transaction_no,
        transaction.account_code,
        transaction.description,
        transaction.debit,
        transaction.credit
      );
    });

    insertStmt.finalize((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Retrieve transactions for a specific company
async function getTransactions(companyId) {
  const query = `SELECT db_path FROM companies WHERE id = ?`;
  const relativePath = await new Promise((resolve, reject) => {
    mainDb.get(query, [companyId], (err, row) => {
      if (err) reject(err);
      else resolve(row.db_path);
    });
  });

  const absolutePath = path.join(__dirname, relativePath);
  const companyDb = new sqlite3.Database(absolutePath);

  return new Promise((resolve, reject) => {
    companyDb.all(`SELECT * FROM transactions`, (err, rows) => {
      companyDb.close();
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Run the script
(async function generateDatabase() {
  try {
    console.log('Initializing main database...');
    await initializeMainDb();

    console.log('Adding sample companies...');
    for (const company of sampleCompanies) {
      const result = await addCompany(company.name);
      console.log(result);
    }

    console.log('Database generation complete!');
    mainDb.close();
  } catch (error) {
    console.error('Error generating database:', error);
    mainDb.close(); // Ensure the main DB is closed in case of an error
  }
})();
