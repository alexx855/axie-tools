# Axie tools

[![npm version](https://img.shields.io/npm/v/axie-tools.svg?label=npm%20version)](https://www.npmjs.com/package/axie-tools)
[![npm downloads](https://img.shields.io/npm/dm/axie-tools.svg?color=blue)](https://www.npmjs.com/package/axie-tools)
[![CI](https://github.com/alexx855/axie-tools/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/alexx855/axie-tools/actions/workflows/ci.yml)
![node version](https://img.shields.io/badge/node-%3E%3D22-brightgreen)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

🚀 **Automate Your Axie Infinity Trading**  
Professional TypeScript CLI and library for seamless marketplace operations on the Ronin blockchain.

TypeScript library and CLI tool for interacting with the Axie Infinity marketplace and NFTs on the Ronin network. Features marketplace operations for both Axies (ERC721) and Materials (ERC1155) including create marketplace orders (fixed-price & auction), cancel orders, settle orders, batch transfers, approval utilities, and wallet information.

## ✨ Features

- 🛒 **Marketplace Operations**: Buy, sell, and auction Axies and Materials on the Ronin marketplace
- 🔄 **Order Management**: Create, cancel, and settle orders with full lifecycle support
- 📦 **Batch Transfers**: Efficiently transfer multiple Axies at once
- ✅ **Approval Utilities**: Streamlined token and marketplace approvals
- 👛 **Wallet Integration**: Complete wallet information and management tools
- 🖥️ **Interactive CLI**: User-friendly command-line interface with guided prompts
- 📚 **TypeScript Library**: Full TypeScript support for programmatic integration
- 🔒 **Type Safety**: Strongly typed operations for reliable blockchain interactions

## 📋 Prerequisites

Before using Axie Tools, ensure you have the following:

- **Node.js** >= 22.0.0 - [Download from official site](https://nodejs.org/en/download/prebuilt-binaries/)
- **Ronin Wallet** - For private key access
- **Axie Infinity Marketplace Account** - For marketplace access token
- **SkyMavis API Key** - Required for API access ([Get from Ronin Developer Console](https://developers.roninchain.com/console/applications))

## Quick Start (CLI via npx)

Run the interactive CLI

```shell
npx axie-tools
```

This will present an interactive menu with the following options:

- Get account info
- Refresh access token
- Approve WETH
- Approve marketplace (for Axies)
- Approve material marketplace (for Materials)
- Settle order (buy axie)
- Settle material order (buy materials)
- Cancel order (delist axie)
- Cancel material order (delist materials)
- Cancel all orders (delist all axies)
- Create order (list axie for sale)
- Create material order (list materials for sale)
- Create auction (list axie for auction)
- Create orders for all axies (list all)
- Transfer axie
- Transfer all axies

The CLI will guide you through the inputs for each action.

> [!TIP]
> You can create an `.env` file from `.env.example` to avoid entering values every time you use the CLI.

![CLIScreenshot](./examples/CLIScreenshot.png)

## Use as a library (Node.js)

Install as a dependency in your project:

```shell
npm install axie-tools ethers dotenv
```

Create a .env file with the following values:

```shell
# Get from Ronin wallet: Manage wallet > Show private key
PRIVATE_KEY="<your private key, copy from ronin wallet: manage wallet > show private key>"
# Get from app.axie: Browser > Developer Tools > Application > Local storage > https://app.axieinfinity.com > accessToken
MARKETPLACE_ACCESS_TOKEN="<your marketplace access token, log in to the marketplace and copy from the developer console>"
# Required - SkyMavis API key (AxieInfinity API has Cloudflare protection and won't work without complex workarounds)
SKYMAVIS_API_KEY="<your skymavis project key, get from https://developers.roninchain.com/console/applications/"
```

Example usage:

- Settle order (buy axie): [complete example code](https://github.com/alexx855/axie-tools/tree/main/examples/settle-order.js)
- Create order (list axie for sale): [complete example code](https://github.com/alexx855/axie-tools/tree/main/examples/create-order.js)
- Create auction (list axie for auction): [complete example code](https://github.com/alexx855/axie-tools/tree/main/examples/create-order-auction.js)
- Cancel order (delist axie): [complete example code](https://github.com/alexx855/axie-tools/tree/main/examples/cancel-order.js)
- Create material order (list materials for sale): [complete example code](https://github.com/alexx855/axie-tools/tree/main/examples/material-order.js)
- Transfer all axies: [complete example code](https://github.com/alexx855/axie-tools/tree/main/examples/transfer-all.js)

## 📖 API Reference

### Marketplace Operations

#### Axie Operations (ERC721)

- `createMarketplaceOrder(orderData, accessToken, signer, skyMavisApiKey)` - Create a fixed-price listing for an Axie
- `cancelMarketplaceOrder(axieId, signer, skyMavisApiKey, order?)` - Cancel an active Axie listing
- `buyMarketplaceOrder(axieId, signer, accessToken, skyMavisApiKey, existingOrder?)` - Purchase an Axie from the marketplace

#### Material Operations (ERC1155)

- `createMaterialMarketplaceOrder(orderData, accessToken, signer, skyMavisApiKey, options?)` - Create a fixed-price listing for Materials
- `cancelMaterialOrder(materialId, signer, skyMavisApiKey)` - Cancel an active Material listing
- `buyMaterialOrder(materialId, quantity, signer, accessToken, skyMavisApiKey)` - Purchase Materials from the marketplace

### Transfer Operations

- `transferAxie(signer, addressTo, axieId)` - Transfer a single Axie to another address
- `batchTransferAxies(signer, addressTo, axieIds)` - Transfer multiple Axies efficiently

### Approval Utilities

- `approveWETH(signer)` - Approve WETH spending for marketplace operations
- `approveMarketplaceContract(signer)` - Approve the Axie marketplace contract
- `approveMaterialMarketplace(signer)` - Approve the Material marketplace contract
- `approveBatchTransfer(signer, batchTransferAddress)` - Approve batch transfer operations

### Utility Functions

- `getAxieIdsFromAccount(address, provider)` - Get all Axie IDs owned by an account
- `getAccountInfo(address, provider, skyMavisApiKey)` - Retrieve wallet and account information
- `refreshToken()` - Refresh marketplace access token
- `getAxieFloorPrice(skyMavisApiKey)` - Get current Axie floor price
- `getMaterialFloorPrice(materialId, skyMavisApiKey, requestedQuantity?)` - Get current Material floor price
- `validateMaterialToken(tokenId, skyMavisApiKey)` - Validate Material token existence

### Contract Helpers

- `getAxieContract()` - Get Axie contract instance
- `getWETHContract()` - Get WETH contract instance
- `getUSDCContract()` - Get USDC contract instance
- `createProvider()` - Create ethers provider for Ronin network

## Clone and build from source

For local development or testing the latest changes:

```shell
git clone https://github.com/alexx855/axie-tools.git
cd axie-tools
npm install
npm run build
```

Or, using pnpm with the included lockfile for a reproducible install:

```shell
git clone https://github.com/alexx855/axie-tools.git
cd axie-tools
pnpm install --frozen-lockfile
pnpm build
```

## Examples

You can run ready-made scripts from the `examples/` folder.

Setup once:

```shell
cd examples
cp .env.example .env
npm install
```

Run specific examples:

```shell
# Buy an Axie (settle an order)
node settle-order.js $AXIE_ID

# List an Axie for a fixed price (in ETH)
node create-order.js $AXIE_ID 0.1

# List an Axie for auction: startPrice endPrice durationHours
node create-order-auction.js $AXIE_ID 0.1 0.5 24

# Cancel a listing for an Axie
node cancel-order.js $AXIE_ID

# List Materials (ERC-1155). Optional: pass quantity to limit amount listed
node material-order.js $MATERIAL_ID [quantity] [priceInETH]

# Transfer all Axies to another wallet
node transfer-all.js $RECIPIENT_ADDRESS
```

Links to example source files:

- [settle-order.js](./examples/settle-order.js)
- [create-order.js](./examples/create-order.js)
- [create-order-auction.js](./examples/create-order-auction.js)
- [cancel-order.js](./examples/cancel-order.js)
- [material-order.js](./examples/material-order.js)
- [transfer-all.js](./examples/transfer-all.js)

### How to get marketplace access token

> [!NOTE]
> Get your access token by logging into [https://app.axieinfinity.com/](https://app.axieinfinity.com/) and accessing Developer Tools > Application > Local storage > [https://app.axieinfinity.com](https://app.axieinfinity.com) > accessToken

![ConsoleScreenshot](./examples/accessTokenConsoleScreenshot.png)

## 🐛 Troubleshooting

### Common Issues and Solutions

#### "Signer is not maker" Error

**Cause**: Incorrect or expired marketplace access token.

**Solution**:

- Refresh your access token by logging out and back into the Axie marketplace
- Verify the token in Developer Tools > Application > Local Storage
- Update your `.env` file with the new token

#### "Insufficient WETH allowance" Error

**Cause**: Haven't approved WETH spending for marketplace transactions.

**Solution**:

- Run `approveWETH()` function or use the CLI "Approve WETH" option
- Alternatively, approve manually in the Axie marketplace website

#### "Marketplace contract not approved" Error

**Cause**: Missing approval for marketplace contract.

**Solution**:

- For Axies: Run `approveMarketplaceContract()` or approve in marketplace
- For Materials: Run `approveMaterialMarketplace()` or approve in marketplace

#### Transaction Failures

**Cause**: Insufficient RON for gas fees.

**Solution**: Ensure you have enough RON in your wallet to cover transaction fees.

#### API Connection Issues

**Cause**: Missing or invalid SkyMavis API key.

**Solution**:

- Get a valid API key from [Ronin Developer Console](https://developers.roninchain.com/console/applications)
- Update your `.env` file with the correct key

#### "Material token not found" Error

**Cause**: Invalid material ID or token doesn't exist.

**Solution**:

- Verify the material ID is correct
- Use `validateMaterialToken(materialId)` to check token validity
- Check available materials in your inventory

### Getting Help

- Check the [examples folder](./examples/) for working code samples
- Review the [API Reference](#-api-reference) for correct function usage
- Open an issue on GitHub for bugs or feature requests

### Considerations

- All marketplace transactions use WETH - ensure sufficient WETH balance for purchases
- Creating orders (listing) is offchain but requires contract approval first
- Settling orders (buying) and cancelling orders are onchain operations
- Material quantity defaults to all available if not specified

## 🤝 Contributing

Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on:

- How to report bugs and request features
- Development setup and workflow
- Code style and testing requirements
- Pull request process

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/axie-tools.git`
3. Install dependencies: `pnpm install`
4. Create a feature branch: `git checkout -b feature/your-feature-name`
5. Make your changes and add tests
6. Run tests: `npm test`
7. Submit a pull request

Feel free to open an issue or a pull request if you have any error, questions or suggestions.

### Testing

Run tests with bun. Set the required environment variables and specify a test file. Default timeout is 5000ms; override with `--timeout`. Examples:

#### Axie Tests

```shell
# Create order (list axie for sale)
AXIE_ID=111111 PRICE=0.1 bun test tests/create-order-axie.test.ts --timeout 30000

# Create orders for all owned axies (list all at floor price if no PRICE specified)
PRICE=0.001 bun test tests/create-orders-all-axies.test.ts --timeout 60000

# Create orders for all owned axies at floor price (automatic price detection)
bun test tests/create-orders-all-axies.test.ts --timeout 60000

# Cancel order (delist axie)
AXIE_ID=111111 PRICE=0.1 bun test tests/cancel-order-axie.test.ts --timeout 30000

# Settle order (buy axie)
AXIE_ID=111111 PRICE=0.1 bun test tests/settle-order-axie.test.ts --timeout 30000
```

#### Material Tests

```shell
# Create material order (list materials for sale) - with specific quantity
MATERIAL_ID=1099511627776 QUANTITY=5 PRICE=0.001 bun test tests/create-order-materials.test.ts --timeout 30000

# Create material order (list ALL available materials at floor price) - quantity optional
MATERIAL_ID=1099511627776  bun test tests/create-order-materials.test.ts --timeout 30000

# Cancel material order (delist materials)
MATERIAL_ID=1099511627776  bun test tests/cancel-order-materials.test.ts --timeout 30000

# Settle material order (buy materials)
MATERIAL_ID=1099511627776 QUANTITY=5 PRICE=0.001 bun test tests/settle-order-materials.test.ts --timeout 30000
```
