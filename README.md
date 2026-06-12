# Axie Tools

```typescript
import { buyMarketplaceOrder, approveWETH, createProvider, Wallet } from "axie-tools";

const provider = createProvider(process.env.SKYMAVIS_API_KEY);
const wallet = new Wallet(process.env.PRIVATE_KEY, provider);

await approveWETH(wallet);
const receipt = await buyMarketplaceOrder(
  12345, // Axie ID
  wallet,
  process.env.MARKETPLACE_ACCESS_TOKEN,
  process.env.SKYMAVIS_API_KEY,
);
```

[![npm version](https://img.shields.io/npm/v/axie-tools.svg?label=npm%20version)](https://www.npmjs.com/package/axie-tools)
[![npm downloads](https://img.shields.io/npm/dm/axie-tools.svg?color=blue)](https://www.npmjs.com/package/axie-tools)
[![CI](https://github.com/alexx855/axie-tools/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/alexx855/axie-tools/actions/workflows/ci.yml)
![node version](https://img.shields.io/badge/node-%3E%3D22-brightgreen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

TypeScript SDK for building Axie Infinity trading bots and AI agents on Ronin network. Automate marketplace operations: buy, sell, list, and transfer Axies and Materials programmatically. Built-in floor price detection, batch transfers, and token management. Includes an interactive CLI for manual use.

## Quick start

Choose the entry point that matches how you want to use Axie Tools.

### Interactive CLI

Run the CLI directly with `npx`:

```bash
npx axie-tools
```

The CLI downloads `axie-tools` and its runtime dependencies for that run. No project install is required.

### TypeScript/JavaScript library

Install the SDK in your project:

```bash
npm install axie-tools
```

`ethers` and `dotenv` are package dependencies, so `npm install axie-tools` is enough for Axie Tools itself. The
examples below import common `ethers` helpers from `axie-tools`; add `ethers` or `dotenv` directly to your own project
only if your application imports those packages itself.

### Credentials

Create a `.env` file for local CLI use or load the same values through your application runtime:

```bash
PRIVATE_KEY="your_ronin_wallet_private_key"
MARKETPLACE_ACCESS_TOKEN="your_access_token"
SKYMAVIS_API_KEY="your_api_key"
# Optional: override the default Ronin public RPC
RONIN_RPC_URL="https://api.roninchain.com/rpc"
```

For local Node.js 22+ scripts, you can load that file without adding another dependency:

```bash
node --env-file=.env your-script.mjs
```

You need:
- A Ronin wallet private key
- A marketplace access token from [app.axieinfinity.com](#getting-your-access-token)
- A SkyMavis API key from the [Developer Console](https://developers.roninchain.com/console/applications) for marketplace API calls
- Optional: a custom Ronin RPC URL if you do not want to use the default public endpoint (`https://api.roninchain.com/rpc`)

### Check floor price and buy an Axie

```typescript
import { getAxieFloorPrice, buyMarketplaceOrder, approveWETH, createProvider, Wallet } from "axie-tools";

const provider = createProvider(process.env.SKYMAVIS_API_KEY);
const wallet = new Wallet(process.env.PRIVATE_KEY, provider);

// Check the floor price first
const floorPrice = await getAxieFloorPrice(process.env.SKYMAVIS_API_KEY);
console.log(`Current floor: ${floorPrice} WETH`);

// Approve WETH spending (one-time)
await approveWETH(wallet);

// Buy a specific Axie
const receipt = await buyMarketplaceOrder(
  12345, // Axie ID to buy
  wallet,
  process.env.MARKETPLACE_ACCESS_TOKEN,
  process.env.SKYMAVIS_API_KEY,
);
console.log(`TX: https://app.roninchain.com/tx/${receipt.hash}`);
```

### List all your Axies for sale

```typescript
import {
  getAxieIdsFromAccount,
  createMarketplaceOrder,
  approveMarketplaceContract,
  createProvider,
  Wallet,
  parseEther,
} from "axie-tools";

const provider = createProvider(process.env.SKYMAVIS_API_KEY);
const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
const address = await wallet.getAddress();

await approveMarketplaceContract(wallet);

const axieIds = await getAxieIdsFromAccount(address, provider);
const block = await provider.getBlock("latest");

for (const axieId of axieIds) {
  await createMarketplaceOrder(
    {
      address,
      axieId: axieId.toString(),
      basePrice: parseEther("0.01").toString(),
      endedPrice: "0",
      startedAt: block.timestamp,
      endedAt: 0,
      expiredAt: block.timestamp + 15634800,
    },
    process.env.MARKETPLACE_ACCESS_TOKEN,
    wallet,
    process.env.SKYMAVIS_API_KEY,
  );
}
```

## API reference

### Market data

| Function | Description |
| --- | --- |
| `getAxieFloorPrice(apiKey)` | Current floor price for Axies |
| `getMaterialFloorPrice(materialId, apiKey, quantity?)` | Current floor price for a material |
| `getAxieIdsFromAccount(address, provider)` | List all Axie IDs owned by an address |
| `getAccountInfo(address, provider, apiKey)` | Wallet balances, allowances, and approval status |
| `validateMaterialToken(materialId, apiKey)` | Check if a material token ID exists |
| `getTokenExpirationInfo(token)` | Check when an access token expires |
| `getGasPrice(signerOrProvider, options?)` | Current network gas price or a supplied override |

### Trading

| Function | Description |
| --- | --- |
| `buyMarketplaceOrder(axieId, wallet, token, apiKey)` | Buy a listed Axie |
| `createMarketplaceOrder(orderData, token, wallet, apiKey)` | List an Axie for sale or auction |
| `cancelMarketplaceOrder(axieId, wallet, apiKey)` | Cancel an Axie listing |
| `buyMaterialOrder(materialId, quantity, wallet, token, apiKey)` | Buy listed materials |
| `createMaterialMarketplaceOrder(orderData, token, wallet, apiKey)` | List materials for sale |
| `cancelMaterialOrder(materialId, wallet, apiKey)` | Cancel a material listing |

### Transfers

| Function | Description |
| --- | --- |
| `transferAxie(wallet, to, axieId)` | Transfer a single Axie |
| `batchTransferAxies(wallet, to, axieIds)` | Transfer up to 100 Axies in one transaction |

### Setup (one-time approvals)

| Function | Description |
| --- | --- |
| `createProvider(apiKey, rpcUrl?)` | Connect to Ronin network using `RONIN_RPC_URL`, `rpcUrl`, or the default public RPC |
| `approveWETH(wallet)` | Approve WETH spending for the marketplace |
| `approveMarketplaceContract(wallet)` | Approve marketplace to handle your Axies |
| `approveMaterialMarketplace(wallet)` | Approve marketplace to handle your materials |
| `approveBatchTransfer(wallet)` | Approve batch transfer contract |

### Common ethers helpers

| Export | Description |
| --- | --- |
| `Wallet` | Create a wallet signer for Ronin transactions |
| `parseEther(value)` | Convert an ETH/WETH amount to wei |
| `parseUnits(value, unit)` | Convert a unit-denominated value, such as gwei, to base units |
| `formatEther(value)` | Format a wei value as ETH/WETH |

### Gas price options

Transaction helpers accept an optional `GasPriceOptions` parameter to customize gas pricing:

```typescript
import { parseUnits, transferAxie, buyMarketplaceOrder } from "axie-tools";

// Use dynamic gas price from the network.
await transferAxie(signer, recipientAddress, axieId);

// Or pass a custom gas price.
const customGasPrice = parseUnits("30", "gwei");
await transferAxie(signer, recipientAddress, axieId, {
  gasPrice: customGasPrice,
});

await buyMarketplaceOrder(axieId, wallet, token, apiKey, {
  gasPrice: customGasPrice,
});
```

By default, transaction helpers fetch the current gas price from the network. If fetching fails, helpers fall back to 26 gwei.

### Contracts

| Function | Description |
| --- | --- |
| `getAxieContract(provider)` | Axie NFT contract instance |
| `getWETHContract(provider)` | WETH token contract instance |
| `getUSDCContract(provider)` | USDC token contract instance |

### Auth

| Function | Description |
| --- | --- |
| `refreshToken(refreshToken)` | Refresh an expired access token |
| `ensureMarketplaceToken()` | Validate and refresh token if needed |

## Bot examples

Ready-to-use bot templates in the [examples folder](./examples/):

| Bot | Description |
| --- | --- |
| [floor-sniper.js](./examples/floor-sniper.js) | Polls floor price, auto-buys when it drops below target |
| [auto-lister.js](./examples/auto-lister.js) | Lists all owned Axies at floor price with configurable markup |

```bash
cd examples && npm install

# Snipe Axies below 0.001 WETH, check every 30 seconds
node floor-sniper.js 0.001 30

# List all your Axies at floor + 10%
node auto-lister.js 1.1
```

### Single operation scripts

| Script | Description |
| --- | --- |
| [settle-order.js](./examples/settle-order.js) | Buy an Axie by ID |
| [create-order.js](./examples/create-order.js) | List an Axie at a fixed price |
| [create-order-auction.js](./examples/create-order-auction.js) | Create a Dutch auction |
| [cancel-order.js](./examples/cancel-order.js) | Cancel a listing |
| [material-order.js](./examples/material-order.js) | List materials for sale |
| [transfer-all.js](./examples/transfer-all.js) | Batch transfer all Axies |

## CLI

For manual operations and testing, use the interactive CLI:

```bash
npx axie-tools
```

> [!TIP]
> Create a `.env` file from `.env.example` to avoid entering values every time. The CLI loads that file automatically.

The CLI provides: account info, token refresh, WETH/marketplace approvals, create/cancel/buy orders for Axies and Materials, auctions, bulk operations, and transfers. For automation, use the library directly.

## Building from source

```bash
git clone https://github.com/alexx855/axie-tools.git
cd axie-tools
npm install
npm run build
```

## Getting your access token

Log into [app.axieinfinity.com](https://app.axieinfinity.com/), open dev tools, go to Application > Local storage > https://app.axieinfinity.com, and copy the `accessToken` value.

[Screenshot showing where to find it](https://github.com/alexx855/axie-tools/blob/main/examples/accessTokenConsoleScreenshot.png)

## Troubleshooting

| Error | Fix |
| --- | --- |
| "Signer is not maker" | Access token expired. Re-login and grab a fresh token. |
| "Insufficient WETH allowance" | Run `approveWETH(wallet)` first. |
| "Marketplace contract not approved" | Run `approveMarketplaceContract(wallet)` or `approveMaterialMarketplace(wallet)`. |
| Transactions failing | Not enough RON for gas. Top up your wallet. |
| API connection problems | Check your `SKYMAVIS_API_KEY` at the [developer console](https://developers.roninchain.com/console/applications). |
| RPC connection problems | Set `RONIN_RPC_URL` to another Ronin-compatible provider such as dRPC, Alchemy, Chainstack, or Moralis. |
| "Material token not found" | Invalid material ID. Use `validateMaterialToken()` to verify. |

## Important notes

- Requires **Node.js 22** or newer.
- All trading uses **WETH**, not ETH. Ensure your wallet has enough WETH before buying.
- Listing items is off-chain but requires contract approvals first. Buying and canceling are on-chain transactions.
- `MARKETPLACE_ACCESS_TOKEN` expires periodically. For long-running bots, use `refreshToken()` and `getTokenExpirationInfo()` to keep it fresh.
- Marketplace API and public RPC providers have rate limits. Use reasonable poll intervals (30s+) in bot loops.

## Testing

Tests use Bun and require environment variables:

```bash
# Axie tests
AXIE_ID=123456 PRICE=0.1 bun test tests/create-order-axie.test.ts --timeout 30000
AXIE_ID=123456 bun test tests/cancel-order-axie.test.ts --timeout 30000
AXIE_ID=123456 bun test tests/settle-order-axie.test.ts --timeout 30000
bun test tests/create-orders-all-axies.test.ts --timeout 60000

# Material tests
MATERIAL_ID=1099511627776 QUANTITY=5 PRICE=0.001 bun test tests/create-order-materials.test.ts --timeout 30000
MATERIAL_ID=1099511627776 bun test tests/cancel-order-materials.test.ts --timeout 30000
MATERIAL_ID=1099511627776 QUANTITY=5 PRICE=0.001 bun test tests/settle-order-materials.test.ts --timeout 30000

# Floor price tests
AXIE_ID=1 bun test tests/axie-floor-price.test.ts --timeout 45000
MATERIAL_ID=1099511627776 bun test tests/material-floor-price.test.ts --timeout 30000
```

## Contributing

Check the [Contributing Guidelines](CONTRIBUTING.md) for details. Open an issue for bugs or ideas.

## License

Released under the MIT License. See the [LICENSE](LICENSE) file.
