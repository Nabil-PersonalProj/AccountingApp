const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure the `database/` folder exists
const databaseFolder = path.join(__dirname, 'company_database');
if (!fs.existsSync(databaseFolder)) {
  fs.mkdirSync(databaseFolder);
}

// Paths
const mainDbPath = path.join(__dirname, 'main.db');

// Main database setup
const mainDb = new sqlite3.Database(mainDbPath);

// Sample companies and transactions
const sampleCompanies = [
  { name: 'Company A1' },
  { name: 'Company B2' },
  { name: 'Company C3' },
];

const sampleTransactions = [
  { transaction_no: 1, account_code: 'CA101', description: 'Asset example', debit: 0, credit: 1000, date: '2024-12-01', account_type: 'asset' },
  { transaction_no: 2, account_code: 'CA102', description: 'Asset example', debit: 0, credit: 300, date: '2024-12-02', account_type: 'asset' },
  { transaction_no: 2, account_code: 'CA103', description: 'Asset example', debit: 0, credit: 2000, date: '2024-12-03', account_type: 'asset' },
  { transaction_no: 3, account_code: 'CB103', description: 'Asset example', debit: 0, credit: 500, date: '2024-12-03', account_type: 'asset' },
  { transaction_no: 3, account_code: 'CL103', description: 'Liabities example', debit: 100, credit: 0, date: '2024-12-03', account_type: 'liabilities' },
  { transaction_no: 1, account_code: 'EX103', description: 'Expense example', debit: 1000, credit: 0, date: '2024-12-03', account_type: 'expense' },
  { transaction_no: 3, account_code: 'EX103', description: 'Equity example', debit: 500, credit: 0, date: '2024-12-03', account_type: 'equity' },
  { transaction_no: 3, account_code: 'SC103', description: 'Equity example', debit: 500, credit: 0, date: '2024-12-03', account_type: 'equity' },
  { transaction_no: 4, account_code: 'PL103', description: 'Profit Example', debit: 500, credit: 0, date: '2024-12-03', account_type: 'profit' },
  { transaction_no: 5, account_code: 'SA103', description: 'Sales example', debit: 500, credit: 0, date: '2024-12-03', account_type: 'sales' },
  { transaction_no: 6, account_code: 'TD103', description: 'Debtors example', debit: 500, credit: 0, date: '2024-12-03', account_type: 'debtors' },
  { transaction_no: 7, account_code: 'TC103', description: 'Creditors example', debit: 500, credit: 0, date: '2024-12-03', account_type: 'creditors' },
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
    const relativeDbPath = `company_database/${name.replace(/\s+/g, '_').toLowerCase()}.db`;
    const absoluteDbPath = path.join(__dirname, relativeDbPath);

    // Add company to the main database
    const insertStmt = mainDb.prepare(`INSERT INTO companies (name, db_path) VALUES (?, ?)`);
    insertStmt.run(name, relativeDbPath, (err) => {
      if (err) {
        insertStmt.finalize();
        return reject(err);
      }

      // Initialize the company's database immediately
      console.log(absoluteDbPath)
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
          credit REAL DEFAULT 0,
          date TEXT DEFAULT CURRENT_DATE,
          account_type TEXT NOT NULL
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
      INSERT INTO transactions (transaction_no, account_code, description, debit, credit, date, account_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    sampleTransactions.forEach((transaction) => {
      insertStmt.run(
        transaction.transaction_no,
        transaction.account_code,
        transaction.description,
        transaction.debit,
        transaction.credit,
        transaction.date,
        transaction.account_type
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

  const absolutePath = path.join(databaseFolder, relativePath);
  const companyDb = new sqlite3.Database(absolutePath);

  return new Promise((resolve, reject) => {
    companyDb.all(`SELECT * FROM transactions ORDER BY date DESC`, (err, rows) => {
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
