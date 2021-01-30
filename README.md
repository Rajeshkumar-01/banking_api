# banking_api

Node, Express & Postgres

## Get list of customers
http://localhost:3000/customers

## To create a new customer account
http://localhost:3000/customer/new/bank/account
{
    "bank": 1,
    "account_type": 1,
    "deposit_amount": 400,
    "customer_id": 1
}

http://localhost:3000/customer/new/bank/account
{
    "bank": 1,
    "account_type": 1,
    "deposit_amount": 800,
    "customer_id": 2
}

## Creating customer account with different account type
http://localhost:3000/customer/new/bank/account
{
    "bank": 1,
    "account_type": 2,
    "deposit_amount": 200,
    "customer_id": 2
}

## Make transaction one customer account to another customer account
http://localhost:3000/bank/transaction
{
    "from_account": 21300110525961,
    "to_account": 21300110540227,
    "amount": 50
}

## To view customer accounts
http://localhost:3000/customer/accounts/2

## To check account balance for the particular account
http://localhost:3000/account/balance/21300110525961

## To list the account transactions
http://localhost:3000/account/transactions/21300110540227

