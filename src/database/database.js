const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { resolve } = require('dns');
const { rejects } = require('assert');
const { type } = require('os');

// Ensure the `database/` folder exists
const databaseFolder = path.join(__dirname, 'company_database');
const accountsFolder = path.join(__dirname, 'company_accounts');
if (!fs.existsSync(databaseFolder)) {
  fs.mkdirSync(databaseFolder);
}
if (!fs.existsSync(accountsFolder)) {
  fs.mkdirSync(accountsFolder);
}


// Main database to store companies
const mainDbPath = path.join(__dirname, 'main.db');
const mainDb = new sqlite3.Database(mainDbPath);

////////////////////////////////////////// Maindb ////////////////////////////////////////////////////////
// Create the main `companies` table if it doesn't exist
mainDb.serialize(() => {
  mainDb.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      transactions_db_path TEXT NOT NULL,
      accounts_db_path TEXT NOT NULL
    )
  `);
});

// Helper function to get database path
async function getCompanyDbPath(companyId) {
  return new Promise((resolve, reject) => {
    mainDb.get( `SELECT transactions_db_path, accounts_db_path FROM companies WHERE id = ?`, [companyId], (err, row) => {
      if (err) {
        console.error("Database Error: ", err);
        return reject(err);
      }
      if (!row) {
        console.error("Company not found: ", companyId)
        return reject(new Error('Company not found.'));
      }
      resolve({
        transactionsDbPath: path.join(__dirname, row.transactions_db_path),
        accountsDbPath: path.join(__dirname, row.accounts_db_path)
      });
    });
  });
}

// Add a new company for each company added, the db for that company is also initialized
function addCompany(name) {
  return new Promise((resolve, reject) => {
      const transactionrelativeDbPath = `company_database/${name.replace(/\s+/g, '_').toLowerCase()}.db`;
      const transactionabsoluteDbPath = path.join(__dirname, transactionrelativeDbPath);
      const accountsrelativeDbPath = `company_accounts/${name.replace(/\s+/g, '_').toLowerCase()}_accounts.db`
      const accountsabsoluteDbPath = path.join(__dirname, accountsrelativeDbPath);

      mainDb.get(`SELECT id FROM companies WHERE name = ?`, [name], (err, row) => {
          if (err) return reject(err);
          if (row) return reject(new Error('Company already exists!'));

          const insertStmt = mainDb.prepare(`INSERT INTO companies (name, transactions_db_path, accounts_db_path) VALUES (?, ?, ?)`);
          insertStmt.run(name, transactionrelativeDbPath, accountsrelativeDbPath, (err) => {
              if (err) {
                  insertStmt.finalize();
                  return reject(err);
              }
              initializeTransactionDatabase(transactionabsoluteDbPath)
                  .then(() => initializeAccountsDatabase(accountsabsoluteDbPath))
                  .then(() =>{
                      insertStmt.finalize();
                      resolve(`Company "${name}" added and both database initialized`);
                  })
                  .catch((error) => {
                      insertStmt.finalize();
                      reject(error);
                  });
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

async function deleteCompany(companyId) {
  return new Promise(async (resolve, reject) => {
    try {
      const { transactionsDbPath, accountsDbPath } = await getCompanyDbPath(companyId);

      mainDb.run(`DELETE FROM companies WHERE id = ?`, [companyId], (deleteErr) => {
        if (deleteErr) return reject(deleteErr);

        // Safely delete databases
        try {
          if (fs.existsSync(transactionsDbPath)) {
            fs.unlink(transactionsDbPath, (err) => {
              if (err) console.error(`Error deleting transactions DB:`, err);
            });
          }
          if (fs.existsSync(accountsDbPath)) {
            fs.unlink(accountsDbPath, (err) => {
              if (err) console.error(`Error deleting accounts DB:`, err);
            });
          }
        } catch (error) {
          console.error('Error deleting company databases:', error);
        }

        resolve('Company and its databases deleted successfully');
      });
    } catch (error) {
      reject(error);
    }
  });
}


////////////////////////////////////////// Companydb ////////////////////////////////////////////////////////
// Initialize a company's database with the `transactions` table
function initializeTransactionDatabase(dbPath) {
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
          date TEXT DEFAULT CURRENT_DATE
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
      const { transactionsDbPath } = await getCompanyDbPath(companyId);
      const db = new sqlite3.Database(transactionsDbPath);
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
      const { transactionsDbPath } = await getCompanyDbPath(companyId);
      const db = new sqlite3.Database(transactionsDbPath);
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
      const { transactionsDbPath } = await getCompanyDbPath(companyId);
      const db = new sqlite3.Database(transactionsDbPath);

      db.serialize(() => {
        db.run('BEGIN TRANSACTION;');

        const insertQuery = `
          INSERT INTO transactions (transaction_no, account_code, description, debit, credit, date)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        const stmt = db.prepare(insertQuery);

        transactions.forEach(transaction => {
          stmt.run([
            transaction.transaction_no, 
            transaction.account_code, 
            transaction.description, 
            transaction.debit, 
            transaction.credit, 
            transaction.date || new Date().toISOString().split('T')[0]
          ]);
        });

        stmt.finalize(); // Finalize the statement

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

async function searchTransaction(companyId, searchQuery) {
  try {
    const { transactionsDbPath } = await getCompanyDbPath(companyId);
    const companyDb = new sqlite3.Database(transactionsDbPath);

    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM transactions 
        WHERE transaction_no = ? OR account_code = ? OR description LIKE ? OR date = ?
      `;

      companyDb.all(query, [searchQuery, searchQuery, `%${searchQuery}%`, searchQuery], (err, rows) => {
        companyDb.close(); // Close the database connection
        if (err) return reject(err);
        resolve(rows);
      });
    });
  } catch (error) {
    return Promise.reject(error);
  }
}

// Update multiple transactions at once
function updateTransactions(companyId, transactions) {
  return new Promise(async (resolve, reject) => {
    if (!transactions || transactions.length === 0) return resolve('No transactions to update');
    try {
      const { transactionsDbPath } = await getCompanyDbPath(companyId);
      const db = new sqlite3.Database(transactionsDbPath);
      db.serialize(() => {
        db.run('BEGIN TRANSACTION;');

        const updateQuery = `
          UPDATE transactions
          SET transaction_no = ?, date = ?, account_code = ?, description = ?, debit = ?, credit = ?
          WHERE transaction_id = ?
        `;


        transactions.forEach(transaction => {
          db.run(updateQuery, [
            transaction.transaction_no, transaction.date, transaction.account_code,
            transaction.description, transaction.debit, transaction.credit, 
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
      const { transactionsDbPath } = await getCompanyDbPath(companyId);
      const db = new sqlite3.Database(transactionsDbPath);
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

////////////////////////////////////////// Accoutndb ////////////////////////////////////////////////////////
function initializeAccountsDatabase(dbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS accounts (
          account_code TEXT PRIMARY KEY,
          account_name TEXT NOT NULL,
          account_type TEXT NOT NULL
        )
      `, (err) => {
        db.close();
        if(err) return reject(err);
        resolve();
      });
    });
  });
}

async function getAccounts(companyId) {
  return new Promise(async (resolve, reject) => {
    try {
      const { accountsDbPath, transactionsDbPath } = await getCompanyDbPath(companyId);
      if (!accountsDbPath || !transactionsDbPath) {
        return resolve([]);
      }
      const accountsDb = new sqlite3.Database(accountsDbPath);
      const transactionsDb = new sqlite3.Database(transactionsDbPath);

      accountsDb.all(`SELECT account_code, account_name, account_type FROM accounts`, [], (err, accounts) => {
        if (err) {
          accountsDb.close();
          transactionsDb.close(); 
          console.error('Error fetching accounts for ${companyId}:', err);
          return reject(err);
        }

        if (!accounts || accounts.length === 0) {
          accountsDb.close();
          transactionsDb.close(); 
          return resolve([]); // no accounts found
        }

        const accountPromises = accounts.map(account => {
          return new Promise((resolveAccount) => {
            const query = `
              SELECT 
                COALESCE(SUM(debit), 0) AS total_debit, 
                COALESCE(SUM(credit), 0) AS total_credit
              FROM transactions
              WHERE account_code = ?`;
            
            transactionsDb.get(query, [account.account_code], (err, row) => {
              const totalCredit = row?.total_credit ?? 0;
              const totalDebit = row?.total_debit ?? 0;
              const balance = totalCredit - totalDebit;

              
              resolveAccount({
                ...account,
                debit: balance < 0 ? (-balance).toFixed(2) : "0.00",
                credit: balance > 0 ? (balance).toFixed(2) : "0.00",
              });
            });
          });
        });

        // Wait for all totals to be calculated
        Promise.all(accountPromises).then(updatedAccounts => {
          accountsDb.close();
          transactionsDb.close();
          resolve(updatedAccounts);
        });
      });
    } catch (error) {
      console.error(`Error retrieving accounts for company ${companyId}:`, error);
      resolve([]); 
    }
  });
}

function addAccount(companyId, accountCode, accountName, accountType) {
  return new Promise(async (resolve, reject) => {
    try{
      const {accountsDbPath} = await getCompanyDbPath(companyId);
      const db = new sqlite3.Database(accountsDbPath);

      db.run(`INSERT INTO accounts (account_code, account_name, account_type) VALUES (?,?,?)`,
        [accountCode,accountName,accountType], (err) => {
          db.close();
          if (err) return reject(err);
          resolve({ success: true, message: 'Account added successfully'});
        });
    } catch (error) {
      reject(error);
    }
  });
}

// Update Multiple Accounts
function updateAccounts(companyId, accounts) {
  return new Promise(async (resolve, reject) => {
      try {
          const { accountsDbPath } = await getCompanyDbPath(companyId);
          const db = new sqlite3.Database(accountsDbPath);
          db.serialize(() => {
              db.run('BEGIN TRANSACTION;');
              const query = `UPDATE accounts SET account_name = ?, account_type = ? WHERE account_code = ?`;
              accounts.forEach(account => {
                  db.run(query, [account.account_name, account.account_type, account.account_code]);
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

// Delete an Account
function deleteAccount(companyId, accountCode) {
  return new Promise(async (resolve, reject) => {
      try {
          const { accountsDbPath } = await getCompanyDbPath(companyId);
          const db = new sqlite3.Database(accountsDbPath);
          db.run(`DELETE FROM accounts WHERE account_code = ?`, [accountCode], (err) => {
              db.close();
              if (err) return reject(err);
              resolve(true);
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
  deleteCompany,
  addAccount,
  deleteAccount,
  updateAccounts,
};