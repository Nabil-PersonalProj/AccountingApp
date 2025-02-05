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

// Helper function to get database path
async function getCompanyDbPath(companyId) {
  return new Promise((resolve, reject) => {
    mainDb.get(`SELECT db_path FROM companies WHERE id = ?`, [companyId], (err, row) => {
      if (err) return reject(err);
      if (!row) return reject(new Error('Company not found.'));
      resolve(path.join(__dirname, row.db_path));
    });
  });
}

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

// Fetch all transactions for a company
function getTransactions(companyId) {
  return new Promise(async (resolve, reject) => {
    try {
      const dbPath = await getCompanyDbPath(companyId);
      const db = new sqlite3.Database(dbPath);
      db.all(`SELECT * FROM transactions`, (err, rows) => {
        db.close();
        if (err) return reject(err);
        resolve(rows);
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Fetch the last transaction for a company
function getLastTransaction(companyId) {
  return new Promise(async (resolve, reject) => {
    try {
      const dbPath = await getCompanyDbPath(companyId);
      const db = new sqlite3.Database(dbPath);
      db.get(`SELECT * FROM transactions ORDER BY transaction_no DESC LIMIT 1`, (err, row) => {
        db.close();
        if (err) return reject(err);
        resolve(row);
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Add multiple transactions to a company's database
function addTransaction(companyId, transactions) {
  return new Promise(async (resolve, reject) => {
    try {
      const dbPath = await getCompanyDbPath(companyId);
      const db = new sqlite3.Database(dbPath);

      db.serialize(() => {
        db.run('BEGIN TRANSACTION;');

        const insertQuery = `
          INSERT INTO transactions (transaction_no, account_code, description, debit, credit, date, account_type)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        transactions.forEach(transaction => {
          db.run(insertQuery, [
            transaction.transaction_no, transaction.account_code,
            transaction.description, transaction.debit, transaction.credit,
            new Date().toISOString().split('T')[0], transaction.account_type
          ]);
        });

        db.run('COMMIT;', function (err) {
          db.close();
          if (err) return reject(err);
          resolve(true);
        });
      });
    } catch (error) {
      reject(error);
    }
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

function searchTransaction(companyId, searchQuery) {
  return new Promise((resolve, reject) => {
    mainDb.get(`SELECT db_path FROM companies WHERE id = ?`, [companyId], (err, row) => {
      if (err) return reject(err);
      const companyDbPath = path.join(__dirname, row.db_path);
      const companyDb = new sqlite3.Database(companyDbPath);

      const query = `
        SELECT * FROM transactions 
        WHERE transaction_no = ? OR account_code = ?
      `;
      companyDb.all(query, [searchQuery, searchQuery], (err, rows) => {
        companyDb.close();
        if (err) return reject(err);
        resolve(rows);
      });
    });
  });
}

// Update multiple transactions at once
function updateTransactions(companyId, transactions) {
  return new Promise(async (resolve, reject) => {
    try {
      const dbPath = await getCompanyDbPath(companyId);
      const db = new sqlite3.Database(dbPath);
      db.serialize(() => {
        db.run('BEGIN TRANSACTION;');

        const updateQuery = `
          UPDATE transactions
          SET transaction_no = ?, date = ?, account_code = ?, description = ?, debit = ?, credit = ?, account_type = ?
          WHERE transaction_id = ?
        `;


        transactions.forEach(transaction => {
          db.run(updateQuery, [
            transaction.transaction_no, transaction.date, transaction.account_code,
            transaction.description, transaction.debit, transaction.credit, transaction.account_type,
            transaction.transaction_id
          ]);
        });

        db.run('COMMIT;', function (err) {
          db.close();
          if (err) return reject(err);
          resolve(true);
        });
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Delete multiple transactions
function deleteTransactions(companyId, transactionIds) {
  return new Promise(async (resolve, reject) => {
    if (!transactionIds || transactionIds.length === 0) {
      return resolve('No transactions to delete.');
    }
    try {
      const dbPath = await getCompanyDbPath(companyId);
      const db = new sqlite3.Database(dbPath);
      db.serialize(() => {
        db.run('BEGIN TRANSACTION;');
        const query = `DELETE FROM transactions WHERE transaction_id = ?`;
        transactionIds.forEach(transactionId => {
          db.run(query, [transactionId]);
        });
        db.run('COMMIT;', function (err) {
          db.close();
          if (err) return reject(err);
          resolve(true);
        });
      });
    } catch (error) {
      reject(error);
    }
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
  updateTransactions,
  deleteTransactions,
};