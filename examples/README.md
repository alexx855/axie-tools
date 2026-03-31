# Axie Tools Examples

Copy `.env.example` to `.env` and fill in your credentials. Do not share your private key.

```bash
npm install
```

## Bot patterns

Ready-to-use bot templates for common automation strategies.

```bash
# Floor price sniper - buys when floor drops below target
node floor-sniper.js 0.001 30

# Auto-lister - lists all your Axies at floor + 10% markup
node auto-lister.js 1.1
```

- [floor-sniper.js](./floor-sniper.js) - Polls floor price, auto-buys below target
- [auto-lister.js](./auto-lister.js) - Lists all owned Axies at floor price with configurable markup

## Single operations

Individual marketplace operations for building your own bot logic.

### Axie operations

```bash
# Buy an Axie
node settle-order.js $AXIE_ID
# List an Axie for sale
node create-order.js $AXIE_ID 0.1
# Create an auction (start 0.1 WETH, end 0.5 WETH, 24 hours)
node create-order-auction.js $AXIE_ID 0.1 0.5 24
# Cancel a listing
node cancel-order.js $AXIE_ID
# Transfer all Axies to another wallet
node transfer-all.js $RECIPIENT_ADDRESS
```

### Material operations

```bash
# List all available materials at floor price
node material-order.js 1099511627776
# List 5 materials at floor price
node material-order.js 1099511627776 5
# List 5 materials at 0.001 WETH each
node material-order.js 1099511627776 5 0.001
# List all available at 0.002 WETH each
node material-order.js 1099511627776 "" 0.002
```
