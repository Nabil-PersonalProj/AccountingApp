const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { resolve } = require('dns');

// Ensure the `database/` folder exists
const databaseFolder = path.join(__dirname, 'company_database');
if (!fs.existsSync(databaseFolder)) {
  fs.mkdirSync(databaseFolder);
}

// Main database to store companies
const mainDbPath = path.join(__dirname, 'main.db');
const mainDb = new sqlite3.Database(mainDbPath);

// Create the main `companies` table if it doesn't exist
mainDb.serialize(() => {
  mainDb.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      db_path TEXT NOT NULL
    )
  `);
});

// Add a new company for each company added, the db for that company is also initialized
function addCompany(name) {
  return new Promise((resolve, reject) => {
    const relativeDbPath = `company_database/${name.replace(/\s+/g, '_').toLowerCase()}.db`;
    const absoluteDbPath = path.join(__dirname, relativeDbPath);

    // Add company into main.db
    const insertStmt = mainDb.prepare(`INSERT INTO companies (name, db_path) VALUES (?,?)`);
    insertStmt.run(name, relativeDbPath, (err) => {
      if (err) {
        insertStmt.finalize();
        return reject(err);
      }

      // Initialize database for the company
      initializeCompanyDatabase(absoluteDbPath)
        .then(() => {
          insertStmt.finalize();
          resolve(`Company "${name}" added and database initialized`);
        })
        .catch((error) => {
          insertStmt.finalize();
          reject(error);
        });
    });
  });
}

// Retrieve the list of companies
function getCompanies() {
  return new Promise((resolve, reject) => {
    mainDb.all(`SELECT * FROM companies`, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Initialize a company's database with the `transactions` table
function initializeCompanyDatabase(dbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
          transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
          transaction_no INTEGER NOT NULL,
          account_code TEXT NOT NULL,
          description TEXT,
          debit REAL DEFAULT 0,
          credit REAL DEFAULT 0,
          date TEXT DEFAULT CURRENT_DATE,
          account_type TEXT NOT NULL
        )
      `, (err) => {
        if (err) {
          db.close();
          return reject(err);
        }
        db.close();
        resolve();
      });
    });
  });
}

// Add a transaction to a company's database
async function addTransaction(companyId, transaction) {

  // Debug: Log raw transaction data
  console.log('Raw Transaction Data Received:', transaction);
  console.log('CompanyId:', companyId);

  const query = `SELECT db_path FROM companies WHERE id = ?`;

  const relativePath = await new Promise((resolve, reject) => {
    mainDb.get(query, [companyId], (err, row) => {
      if (err) reject(err);
      else resolve(row.db_path);
    });
  });
  
  console.log('relative path: ', relativePath);

  const companyDbPath = path.join(__dirname, relativePath);
  console.log('absolute path: ', companyDbPath);
  const db = new sqlite3.Database(companyDbPath);

  const {
      transaction_no,
      account_code,
      description,
      debit,
      credit,
      transaction_date,
      account_type
    } = transaction;

  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO transactions (transaction_no, account_code, description, debit, credit, date, account_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    console.log('Executing SQL Query:', query, [
      transaction_no,
      account_code,
      description,
      debit,
      credit,
      transaction_date,
      account_type
    ]);
    db.run(
      query,
      [transaction_no, account_code, description, debit, credit, transaction_date, account_type],
      function (err) {
        if (err) {
          db.close();
          return reject(err);
        }
        db.close();
        resolve(this.lastID);
      }
    );
  });
}

function getTransactions(companyId) {
  return new Promise((resolve, reject) => {
    mainDb.get(`SELECT db_path FROM companies WHERE id = ?`, [companyId], (err, row) => {
      if (err) return reject(`Error fetching db_path for company ID ${companyId}: ${err.message}`);
      if (!row) return reject(`No company found with ID ${companyId}`);

      // Access the company's database
      const companyDbPath = path.join(__dirname, row.db_path);
      const companyDb = new sqlite3.Database(companyDbPath);

      companyDb.all(`SELECT * FROM transactions`, (err, rows) => {
        companyDb.close(); // Close the database after query
        if (err) return reject(`Error fetching transactions: ${err.message}`);
        resolve(rows); // Return the transactions as an array
      });
    });
  });
}

async function getAccounts(companyId) {
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
    companyDb.all(
      `SELECT account_code, description, SUM(debit) AS debit, SUM(credit) AS credit
       FROM transactions
       GROUP BY account_code, description`,
      (err, rows) => {
        companyDb.close();
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function getLastTransaction(companyId) {
  return new Promise((resolve, reject) => {
    mainDb.get(`SELECT db_path FROM companies WHERE id = ?`, [companyId], (err, row) => {
      if (err) return reject(`Error fetching db_path for company ID ${companyId}: ${err.message}`);
      if (!row) return reject(`No company found with ID ${companyId}`);

      // Construct the path to the company's database
      const companyDbPath = path.join(__dirname, row.db_path);

      const companyDb = new sqlite3.Database(companyDbPath);
      companyDb.get(
        `SELECT * FROM transactions ORDER BY transaction_no DESC LIMIT 1`, // Sort by transaction_no
        (err, lastTransaction) => {
          companyDb.close();
          if (err) return reject(`Error fetching last transaction: ${err.message}`);
          resolve(lastTransaction); // Return only the last transaction
        }
      );
    });
  });
}

function searchTransaction(companyId, searchQuery) {
  return new Promise((resolve, reject) => {
    mainDb.get(`SELECT db_path FROM companies WHERE id = ?`, [companyId], (err, row) => {
      if (err) return reject(err);
      const companyDbPath = path.join(__dirname, row.db_path);
      const companyDb = new sqlite3.Database(companyDbPath);

      const query = `
        SELECT * FROM transactions 
        WHERE transaction_no = ?
      `;
      companyDb.all(query, [searchQuery], (err, rows) => {
        companyDb.close();
        if (err) return reject(err);
        resolve(rows);
      });
    });
  });
}



module.exports = {
  addCompany,
  getCompanies,
  getTransactions,
  getLastTransaction, 
  getAccounts,
  searchTransaction,
  addTransaction,
};