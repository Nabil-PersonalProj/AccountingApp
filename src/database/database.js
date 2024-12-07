const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure the `database/` folder exists
const databaseFolder = path.join(__dirname, 'Com_database');
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
    const relativeDbPath = `Com_database/${name.replace(/\s+/g, '_').toLowerCase()}.db`;
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
          transaction_no INTEGER,
          account_code TEXT NOT NULL,
          description TEXT,
          debit REAL DEFAULT 0,
          credit REAL DEFAULT 0
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
function addTransaction(companyDbPath, transaction) {
  const db = new sqlite3.Database(companyDbPath);
  const { transaction_no, account_code, description, debit, credit } = transaction;

  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO transactions (transaction_no, account_code, description, debit, credit)
      VALUES (?, ?, ?, ?, ?)
    `;
    db.run(query, [transaction_no, account_code, description, debit, credit], function (err) {
      if (err) {
        db.close();
        return reject(err);
      }
      db.close();
      resolve(this.lastID);
    });
  });
}

// Get transactions for a specific company
function getTransactions(companyDbPath) {
  const db = new sqlite3.Database(companyDbPath);

  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM transactions`, (err, rows) => {
      if (err) {
        db.close();
        return reject(err);
      }
      db.close();
      resolve(rows);
    });
  });
}

module.exports = {
  addCompany,
  getCompanies,
  addTransaction,
  getTransactions,
};
