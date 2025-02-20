const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Get all company databases
const databaseFolder = path.join(__dirname, 'company_database');

fs.readdir(databaseFolder, (err, files) => {
  if (err) {
    console.error('Error reading database directory:', err);
    return;
  }

  const dbFiles = files.filter(file => file.endsWith('.db'));
  dbFiles.forEach(file => migrateDatabase(path.join(databaseFolder, file)));
});

function migrateDatabase(dbPath) {
  const db = new sqlite3.Database(dbPath);

  db.serialize(() => {
    db.all("PRAGMA table_info(transactions)", (err, rows) => {
      if (err) {
        console.error(`Error checking schema for ${dbPath}:`, err);
        db.close();
        return;
      }

      if (!Array.isArray(rows)) {
        console.error(`Unexpected result from PRAGMA query for ${dbPath}:`, rows);
        db.close();
        return;
      }

      const hasAccountType = rows.some(column => column.name === 'account_type');
      if (!hasAccountType) {
        console.log(`No migration needed for ${dbPath}`);
        db.close();
        return;
      }

      console.log(`Migrating ${dbPath}...`);

      db.run(`
        CREATE TABLE transactions_new (
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
          console.error(`Error creating new transactions table for ${dbPath}:`, err);
          db.close();
          return;
        }

        db.run(`
          INSERT INTO transactions_new (transaction_id, transaction_no, account_code, description, debit, credit, date)
          SELECT transaction_id, transaction_no, account_code, description, debit, credit, date
          FROM transactions
        `, (err) => {
          if (err) {
            console.error(`Error migrating data for ${dbPath}:`, err);
            db.close();
            return;
          }

          db.run("DROP TABLE transactions", (err) => {
            if (err) {
              console.error(`Error dropping old transactions table for ${dbPath}:`, err);
              db.close();
              return;
            }

            db.run("ALTER TABLE transactions_new RENAME TO transactions", (err) => {
              if (err) {
                console.error(`Error renaming new transactions table for ${dbPath}:`, err);
              } else {
                console.log(`Migration completed for ${dbPath}`);
              }

              db.close();
            });
          });
        });
      });
    });
  });
}
