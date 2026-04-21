# Axie Tools Examples

These scripts are live examples for interacting with the Axie marketplace and Ronin network. They are not dry-run demos.

## Safety

- Use a dedicated low-value Ronin wallet.
- `PRIVATE_KEY` and `MARKETPLACE_ACCESS_TOKEN` are secrets. Do not commit or share them.
- Most scripts create approvals, listings, purchases, cancellations, or transfers.
- Buying uses WETH, and on-chain transactions require RON for gas.
- If you only need read-only market data, start with the library helpers in the root [`README.md`](../README.md) instead of these scripts.

## Setup

```bash
cp .env.example .env
npm install
```

## Environment variables

| Variable | Used by |
| --- | --- |
| `PRIVATE_KEY` | All example scripts |
| `MARKETPLACE_ACCESS_TOKEN` | `floor-sniper.js`, `auto-lister.js`, `settle-order.js`, `create-order.js`, `create-order-auction.js`, `material-order.js` |
| `SKYMAVIS_API_KEY` | All example scripts |

## Script catalog

| Script | Purpose | Side effects | Risk |
| --- | --- | --- | --- |
| [`floor-sniper.js`](./floor-sniper.js) | Poll floor price and auto-buy below a target | Repeated buy attempts plus WETH approval | High |
| [`auto-lister.js`](./auto-lister.js) | List all owned Axies at floor price plus markup | Lists all owned Axies plus marketplace approval | High |
| [`settle-order.js`](./settle-order.js) | Buy one Axie by ID | Buy transaction plus WETH approval | High |
| [`create-order.js`](./create-order.js) | List one Axie at a fixed price | Marketplace listing plus approval | Medium |
| [`create-order-auction.js`](./create-order-auction.js) | Create one Dutch auction | Marketplace auction plus approval | Medium |
| [`cancel-order.js`](./cancel-order.js) | Cancel one Axie listing | On-chain cancellation | Medium |
| [`material-order.js`](./material-order.js) | List Materials for sale | Marketplace listing plus approval | Medium |
| [`transfer-all.js`](./transfer-all.js) | Transfer all owned Axies to another wallet | On-chain transfer of up to 100 Axies | Very high |

## Bot patterns

Ready-to-use automation scripts.

```bash
# Floor price sniper - buys when floor drops below target
node floor-sniper.js 0.001 30

# Auto-lister - lists all your Axies at floor + 10% markup
node auto-lister.js 1.1
```

## Single operations

These are useful building blocks when you want explicit control over one action at a time.

### Axie operations

```bash
# Buy an Axie
node settle-order.js $AXIE_ID

# List an Axie for sale at 0.1 WETH
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
# List all available Materials at floor price
node material-order.js 1099511627776

# List 5 Materials at floor price
node material-order.js 1099511627776 5

# List 5 Materials at 0.001 WETH each
node material-order.js 1099511627776 5 0.001

# List all available Materials at 0.002 WETH each
node material-order.js 1099511627776 "" 0.002
```

## High-risk scripts

- `floor-sniper.js` runs indefinitely and can buy as soon as the price condition is met.
- `auto-lister.js` attempts to list every owned Axie.
- `transfer-all.js` moves every owned Axie it can find, up to 100 in one batch.
