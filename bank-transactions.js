var dateFormat = require("dateformat");
const Pool = require('pg').Pool
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'pc_bank',
  password: '',
  port: 5432,
})

const CREDIT_TRANSACTION_TYPE = 1;
const DEBIT_TRANSACTION_TYPE = 2;

const getCustomers = (request, response) => {
  pool.query('SELECT * FROM customers ORDER BY id ASC', (error, results) => {
    if (error) {
      response.status(500).send({error})
      return;
    }
    response.status(200).json(results.rows)
  })
}

const getCustomerAccounts = (request, response) => {
  pool.query('SELECT c.name as customer_name, b.name as bank_name, ba.id as bank_account_id, ba.account_no, ba.balance, ac.name, ba.created_time, ba.updated_time FROM customers c inner join bank_account ba on c.id=ba.customer_id join bank b on ba.bank_id=b.id join account_type ac on ba.account_type_id=ac.id where c.id='+request.params.customerId+' ORDER BY ba.created_time DESC', (error, results) => {
    if (error) {
      response.status(500).send({error})
      return;
    }
    response.status(200).json(results.rows)
  })
}

const getTransactions = (request, response) => {
  pool.query(`SELECT bt.id as transaction_id, bt.bank_account_id, bt.amount, tt.name, bt.transaction_time as transaction_type from bank_transaction bt inner join bank_account ba on bt.bank_account_id = ba.id join transaction_type tt on bt.transaction_type_id=tt.id where ba.account_no = '${request.params.accountNo}' ORDER BY bt.transaction_time DESC`, (error, results) => {
    if (error) {
      response.status(500).send({error})
      return;
    }
    if (results.rows.length === 0) {
        response.status(500).send({error: 'Account does not exist. Please give a right account number'})
    }
    console.log('-----', JSON.stringify(results))
    response.status(200).json(results.rows)
  })
}

const getAccountBalance = (request, response) => {
  pool.query(`SELECT balance FROM bank_account where account_no='${request.params.accountNo}'`, (error, results) => {
    if (error) {
      response.status(500).send({error})
      return;
    }
    if (results.rows.length === 0) {
        response.status(500).send({error: 'Account does not exist. Please give a right account number'})
    }
    response.status(200).json(results.rows[0])
  })
}

function checkCustomerAccountAlreadyExist(accountType, customerId) {
    return new Promise((resolve, reject) => {
      pool.query('SELECT id FROM bank_account where account_type_id = '+accountType+' and customer_id = '+customerId+' ORDER BY id ASC', (error, results) => {
        if (error) {
           reject(error)
        }
        resolve(results.rows.length > 0)
      })
    })
}

function checkBankAccountBalanceExist(accountNo) {
    return new Promise((resolve, reject) => {
      pool.query(`SELECT id, balance FROM bank_account where account_no = '${accountNo}'`, (error, results) => {
        if (error) {
           reject(error)
        }
        if (results.rows.length > 0) {
            let account = results.rows[0];
            resolve({id: account.id, balance: Number(account.balance)})
        } else {
            reject('Given account no : ' + accountNo + ' not valid. Please try with valid account number')
        }
      })
    })
}

function createBankAccount(accountNo, bank, accountType, depositAmount, customerId) {
    return new Promise((resolve, reject) => {
       let now = new Date();
       pool.query('INSERT INTO bank_account (account_no, bank_id, account_type_id, balance, customer_id, created_time, updated_time) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [accountNo, bank, accountType, depositAmount, customerId, now, now], (error, results) => {
           if (error) {
              reject(error)
           }
           console.log(`Account no : ${accountNo}, account id: ${results.rows[0].id}`)
           resolve(results.rows[0].id)
       })
    })
}

function createBankTransaction(bankAccount, amount, type) {
    let now = new Date();
    return new Promise((resolve, reject) => {
        pool.query('INSERT INTO bank_transaction (bank_account_id, transaction_type_id, amount, transaction_time) VALUES ($1, $2, $3, $4) RETURNING *', [bankAccount, type, amount, now], (error, results) => {
            if (error) {
              reject(error)
            }
            console.log(`Bank account : ${bankAccount}, amount : ${amount}, type : ${type}, transaction id : ${results.rows[0].id}`)
            resolve(results.rows[0].id)
        })
    })
}

function updateBankBalance(bankAccountNo, amount) {
    let now = new Date();
    return new Promise((resolve, reject) => {
        pool.query('UPDATE bank_account SET balance = $1, updated_time = $2 WHERE account_no = $3', [amount, now, bankAccountNo], (error, results) => {
            if (error) {
              reject(error)
            }
            console.log(`Bank account : ${bankAccountNo}, amount : ${amount}`)
            resolve(results)
        })
    })
}

const createNewCustomerBankAccount = async (request, response) => {
    const { account_type, bank, deposit_amount, customer_id } = request.body
    let now = new Date();
    let accountNo = dateFormat(now, "yyddmmhhMMss") + Math.floor(Math.random() * 100);

    Promise.resolve('')
    .then(async () => {
        return await checkCustomerAccountAlreadyExist(account_type, customer_id)
    }).then(async isAccountExist => {
        if (!isAccountExist) {
            return await createBankAccount(accountNo, bank, account_type, deposit_amount, customer_id)
        } else {
            throw 'Account already exist for this customer and account type'
        }
    }).then(async bankAccountId => {
        await createBankTransaction(bankAccountId, deposit_amount, CREDIT_TRANSACTION_TYPE);
        return bankAccountId;
    }).then(bankAccountId => {
        response.status(201).send(`Customer account added with ID: ${bankAccountId}`)
    }).catch(exception => {
        console.log('--------', exception)
        response.status(500).send({error: exception})
    })

}

const createNewTransaction = async (request, response) => {
    const { from_account, to_account, amount } = request.body
    let now = new Date();

    Promise.resolve('')
    .then(async () => {
        return await checkBankAccountBalanceExist(from_account)
    }).then(async (fromAccount) => {
        if (fromAccount.balance >= amount) {
            return { fromAccount, toAccount: await checkBankAccountBalanceExist(to_account) }
        } else {
            throw 'Your have only ' + fromAccount.balance + ' rupees in your account. Sorry, could not complete this transaction.';
        }
    }).then(async bankAccounts => {
        await updateBankBalance(from_account, bankAccounts.fromAccount.balance - amount)
        return bankAccounts;
    }).then(async bankAccounts => {
        await updateBankBalance(to_account, bankAccounts.toAccount.balance + amount)
        return bankAccounts;
    }).then(async bankAccounts => {
        console.log(bankAccounts.toAccount.id, amount, CREDIT_TRANSACTION_TYPE)
        await createBankTransaction(bankAccounts.toAccount.id, amount, CREDIT_TRANSACTION_TYPE)
        return bankAccounts;
    }).then(async bankAccounts => {
        console.log(bankAccounts.fromAccount.id, amount, DEBIT_TRANSACTION_TYPE)
        return await createBankTransaction(bankAccounts.fromAccount.id, amount, DEBIT_TRANSACTION_TYPE)
    }).then(bankTransactionId => {
        response.status(201).send({message: `Transaction successfully completed`, transactionRefNo: bankTransactionId})
    }).catch(exception => {
        console.log('--------', exception)
        response.status(500).send({error: exception})
    })

}

module.exports = {
  getCustomers,
  createNewCustomerBankAccount,
  getCustomerAccounts,
  getAccountBalance,
  getTransactions,
  createNewTransaction
}