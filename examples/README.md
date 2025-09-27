# Axie Tools Node Example

Then, copy the `.env.example` file to `.env` and fill in your account access token and private key. Please do not share your private key with anyone.

## Install dependencies

```bash
npm install
```

## Run the scripts

### Axie Operations

```bash
# This will buy the $AXIE_ID (settle an order)
node settle-order.js $AXIE_ID
# This will create a sale for the $AXIE_ID for 0.1 ETH
node create-order.js $AXIE_ID 0.1
# This will create an auction for the $AXIE_ID from 0.1 ETH to 0.5 ETH with a duration of 24 hours
node create-order-auction.js $AXIE_ID 0.1 0.5 24
# This will cancel the sale for the $AXIE_ID
node cancel-order.js $AXIE_ID
# This will transfer all Axies from the account to the $RECIPIENT_ADDRESS
node transfer-all.js $RECIPIENT_ADDRESS
```

### Material Operations

```bash
# This will list all available materials at floor price
node material-order.js 1099511627776
# This will list 5 materials at floor price
node material-order.js 1099511627776 5
# This will list 5 materials at 0.001 WETH each
node material-order.js 1099511627776 5 0.001
# This will list all available materials at 0.002 WETH each
node material-order.js 1099511627776 "" 0.002
```
