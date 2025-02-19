const { addTransaction, getTransactions } = require('./database');

const companyId = 2; // Company ID for testing

const testTransactions = [
    {
        transaction_no: 1001,
        account_code: 'CA101',
        description: 'Purchase of office supplies',
        debit: 500.00,
        credit: 0.00,
        date: '2025-02-11',
        account_type: 'asset'
    },
    {
        transaction_no: 1001,
        account_code: 'CL201',
        description: 'Accounts Payable',
        debit: 0.00,
        credit: 500.00,
        date: '2025-02-11',
        account_type: 'liabilities'
    },
    {
        transaction_no: 1001,
        account_code: 'EX301',
        description: 'Electricity Bill Payment',
        debit: 200.00,
        credit: 0.00,
        date: '2025-02-11',
        account_type: 'expense'
    },
    {
        transaction_no: 1001,
        account_code: 'CA101',
        description: 'Cash Payment',
        debit: 0.00,
        credit: 200.00,
        date: '2025-02-11',
        account_type: 'asset'
    },
    {
        transaction_no: 1001,
        account_code: 'SA401',
        description: 'Product Sale',
        debit: 0.00,
        credit: 1500.00,
        date: '2025-02-11',
        account_type: 'sales'
    },
    {
        transaction_no: 1001,
        account_code: 'TD501',
        description: 'Customer Payment Received',
        debit: 1500.00,
        credit: 0.00,
        date: '2025-02-11',
        account_type: 'debtors'
    },
    {
        transaction_no: 1001,
        account_code: 'EX302',
        description: 'Rent Payment',
        debit: 1200.00,
        credit: 0.00,
        date: '2025-02-11',
        account_type: 'expense'
    },
    {
        transaction_no: 1001,
        account_code: 'CA101',
        description: 'Bank Withdrawal for Rent',
        debit: 0.00,
        credit: 1200.00,
        date: '2025-02-11',
        account_type: 'asset'
    },
    {
        transaction_no: 1001,
        account_code: 'PL601',
        description: 'Investment Gain',
        debit: 0.00,
        credit: 800.00,
        date: '2025-02-11',
        account_type: 'profit'
    },
    {
        transaction_no: 1001,
        account_code: 'SC701',
        description: 'Shareholder Dividend',
        debit: 800.00,
        credit: 0.00,
        date: '2025-02-11',
        account_type: 'equity'
    }
];

async function testBulkInsertion() {
    try {
        console.log('Inserting transactions...');
        const result = await addTransaction(companyId, testTransactions);
        console.log('Bulk Insert Result:', result);

        console.log('Fetching all transactions for Company ID 2...');
        const transactions = await getTransactions(companyId);
        console.log('All Transactions:', transactions);
    } catch (error) {
        console.error('Error during bulk insert test:', error);
    }
}

testBulkInsertion();