# Axie tools

```typescript
  import { buyMarketplaceOrder, approveWETH } from "axie-tools";
  console.log(`🛒 Approving WETH for marketplace...`);
  await approveWETH(wallet);

  console.log(`🛒 Buying Axie ${axieId}...`);
  const receipt = await buyMarketplaceOrder(
    axieId,
    wallet,
    process.env.MARKETPLACE_ACCESS_TOKEN,
    process.env.SKYMAVIS_API_KEY,
  );
  if (receipt) {
    console.log(
      "🔗 View transaction: https://app.roninchain.com/tx/" + receipt.hash,
    );
  }
```

[![npm version](https://img.shields.io/npm/v/axie-tools.svg?label=npm%20version)](https://www.npmjs.com/package/axie-tools)
[![npm downloads](https://img.shields.io/npm/dm/axie-tools.svg?color=blue)](https://www.npmjs.com/package/axie-tools)
[![CI](https://github.com/alexx855/axie-tools/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/alexx855/axie-tools/actions/workflows/ci.yml)
![node version](https://img.shields.io/badge/node-%3E%3D22-brightgreen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Trade Axie Infinity NFTs and materials directly from your terminal, scripts or bots. This TypeScript library and CLI makes it easy to buy, sell, and manage your Axies and Materials on Ronin Network. Works with both individual items and bulk operations, so you can manage your entire collection without opening a browser.

## What it does

Buy, sell, and auction your Axies and materials. The tool handles both individual transactions and bulk operations when you want to list your entire collection.

Transfer multiple Axies at once instead of doing them one by one. Set up marketplace approvals without dealing with the web interface. Get your wallet info and manage everything through simple commands.

The interactive CLI walks you through each step, or you can use the TypeScript library if you want to build your own scripts.

## What you need

You'll need a few things set up first:

- Node.js 22 or newer ([download here](https://nodejs.org/en/download/prebuilt-binaries/))
- Your Ronin wallet private key
- An Axie Infinity marketplace account for the access token ([see how to get it](#getting-your-access-token))
- A SkyMavis API key from the [Ronin Developer Console](https://developers.roninchain.com/console/applications)

## Try it right now

Just run this and you'll get an interactive menu:

```shell
npx axie-tools
```

The menu gives you options like:

- Check your account info
- Refresh your access token
- Approve WETH spending
- Approve the marketplace contracts
- Buy an Axie or materials
- List your stuff for sale
- Cancel your listings
- Set up auctions
- Transfer Axies around

Pick what you want to do and the tool walks you through it.

> [!TIP]
> You can create an `.env` file from `.env.example` to avoid entering values every time you use the CLI.

## Using it in your own code

Install it in your project:

```shell
npm install axie-tools ethers dotenv
```

Make a .env file with your credentials:

```shell
# Your wallet private key (Ronin wallet > Manage wallet > Show private key)
PRIVATE_KEY="your_private_key_here"
# Marketplace token (log into app.axieinfinity.com, open dev tools > Application > Local storage > accessToken)
MARKETPLACE_ACCESS_TOKEN="your_access_token_here"
# API key from https://developers.roninchain.com/console/applications/
SKYMAVIS_API_KEY="your_api_key_here"
```

Check out the examples folder for working code:

- [Buy an Axie](https://github.com/alexx855/axie-tools/tree/main/examples/settle-order.js)
- [List an Axie for sale](https://github.com/alexx855/axie-tools/tree/main/examples/create-order.js)
- [Create an auction](https://github.com/alexx855/axie-tools/tree/main/examples/create-order-auction.js)
- [Cancel a listing](https://github.com/alexx855/axie-tools/tree/main/examples/cancel-order.js)
- [List materials for sale](https://github.com/alexx855/axie-tools/tree/main/examples/material-order.js)
- [Transfer all your Axies](https://github.com/alexx855/axie-tools/tree/main/examples/transfer-all.js)

### Functions you can use

**Axie stuff:**
- `createMarketplaceOrder()` - List an Axie for sale
- `cancelMarketplaceOrder()` - Remove your listing
- `buyMarketplaceOrder()` - Buy someone else's Axie

**Materials:**
- `createMaterialMarketplaceOrder()` - List materials for sale
- `cancelMaterialOrder()` - Remove material listing
- `buyMaterialOrder()` - Buy materials

**Moving things around:**
- `transferAxie()` - Send one Axie to another wallet
- `batchTransferAxies()` - Send multiple Axies at once

**Approvals (you need these before trading):**
- `approveWETH()` - Let the marketplace spend your WETH
- `approveMarketplaceContract()` - Let the marketplace handle your Axies
- `approveMaterialMarketplace()` - Let the marketplace handle your materials

**Useful helpers:**
- `getAxieIdsFromAccount()` - See what Axies someone owns
- `getAccountInfo()` - Get wallet info
- `getAxieFloorPrice()` - Current floor price for Axies
- `getMaterialFloorPrice()` - Current floor price for specific materials
- `createProvider()` - Connect to the Ronin network

## Building from source

Want to hack on it or try the latest changes?

```shell
git clone https://github.com/alexx855/axie-tools.git
cd axie-tools
npm install
npm run build
```

If you use pnpm:

```shell
git clone https://github.com/alexx855/axie-tools.git
cd axie-tools
pnpm install --frozen-lockfile
pnpm build
```

## Examples

There are working scripts in the `examples/` folder you can try out.

Set them up once:

```shell
cd examples
cp .env.example .env
npm install
```

Then run whatever you want:

```shell
# Buy an Axie
node settle-order.js $AXIE_ID

# List an Axie for 0.1 ETH
node create-order.js $AXIE_ID 0.1

# Create an auction (start at 0.1, end at 0.5, run for 24 hours)
node create-order-auction.js $AXIE_ID 0.1 0.5 24

# Cancel your listing
node cancel-order.js $AXIE_ID

# List some materials
node material-order.js $MATERIAL_ID [quantity] [priceInETH]

# Send all your Axies to another wallet
node transfer-all.js $RECIPIENT_ADDRESS
```

All the source code is here:

- [settle-order.js](./examples/settle-order.js)
- [create-order.js](./examples/create-order.js)
- [create-order-auction.js](./examples/create-order-auction.js)
- [cancel-order.js](./examples/cancel-order.js)
- [material-order.js](./examples/material-order.js)
- [transfer-all.js](./examples/transfer-all.js)

### Getting your access token

Log into [app.axieinfinity.com](https://app.axieinfinity.com/), open your browser's dev tools, and go to Application > Local storage > https://app.axieinfinity.com. Copy the `accessToken` value.

[Here's a screenshot](https://github.com/alexx855/axie-tools/blob/main/examples/accessTokenConsoleScreenshot.png) if you need to see exactly where it is.

## When things go wrong

**"Signer is not maker" error**

Your access token expired or is wrong. Log out of the marketplace, log back in, and grab a fresh token from dev tools.

**"Insufficient WETH allowance" error**

You need to approve WETH spending first. Either run `approveWETH()` or use the CLI approve option.

**"Marketplace contract not approved" error**

Same deal but for the marketplace contracts. Run `approveMarketplaceContract()` for Axies or `approveMaterialMarketplace()` for materials.

**Transactions failing**

Probably not enough RON for gas. Make sure you have some RON in your wallet.

**API connection problems**

Your SkyMavis API key is missing or wrong. Get a new one from the [developer console](https://developers.roninchain.com/console/applications) and update your .env file.

**"Material token not found" error**

The material ID you're using doesn't exist. Double check the ID or use `validateMaterialToken()` to verify it's real.

### Getting help

Look at the examples folder for working code, check the function list above, or open an issue on GitHub if something's broken.

### Things to know

All buying and selling uses WETH, not ETH. Make sure you have enough WETH in your wallet before trying to buy stuff.

Listing items for sale happens off-chain but you need to approve the contracts first. Actually buying and canceling listings are real blockchain transactions.

## Contributing

Want to help out? Check the [Contributing Guidelines](CONTRIBUTING.md) for the full details, but basically:

1. Fork the repo
2. Clone it: `git clone https://github.com/your-username/axie-tools.git`
3. Install stuff: `pnpm install`
4. Make a branch: `git checkout -b feature/your-thing`
5. Do your changes and add tests
6. Run tests: `npm test`
7. Send a pull request

Open an issue if you find bugs or have ideas.

### Testing

Tests run with bun. You need the environment variables set up and might need to bump the timeout since blockchain stuff is slow.

Some examples:

```shell
# Test listing an Axie
AXIE_ID=111111 PRICE=0.1 bun test tests/create-order-axie.test.ts --timeout 30000

# Test listing all your Axies at floor price
bun test tests/create-orders-all-axies.test.ts --timeout 60000

# Test buying an Axie
AXIE_ID=111111 PRICE=0.1 bun test tests/settle-order-axie.test.ts --timeout 30000

# Test listing materials
MATERIAL_ID=1099511627776 QUANTITY=5 PRICE=0.001 bun test tests/create-order-materials.test.ts --timeout 30000

# Test buying materials
MATERIAL_ID=1099511627776 QUANTITY=5 PRICE=0.001 bun test tests/settle-order-materials.test.ts --timeout 30000
```

## License

Released under the MIT License. See the `LICENSE` file for details.

