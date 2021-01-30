const express = require('express')
const bodyParser = require('body-parser')
const db = require('./bank-transactions')

const app = express()
const port = 3000

app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
)

app.get('/', (request, response) => {
  response.json({ info: 'PayConstruct - Node.js, Express, and Postgres API' })
})

app.get('/customers', db.getCustomers)
app.post('/customer/new/bank/account', db.createNewCustomerBankAccount)
app.get('/customer/accounts/:customerId', db.getCustomerAccounts)
app.get('/account/balance/:accountNo', db.getAccountBalance)
app.get('/account/transactions/:accountNo', db.getTransactions)
app.post('/bank/transaction', db.createNewTransaction)

app.listen(port, () => {
  console.log(`App running on port ${port}.`)
})

