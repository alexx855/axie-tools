# Axie Tools Agent Guide

This repository is a TypeScript SDK and CLI for live Axie Infinity marketplace operations on Ronin. It is not a sandbox project. Most write helpers and example scripts can place listings, buy assets, cancel orders, or transfer Axies on-chain.

## Read first

- `README.md`: public install flow, common tasks, API groups, and examples.
- `index.ts`: public library exports.
- `cli.ts`: interactive CLI entry point.
- `examples/README.md`: script catalog, required env vars, and risk levels.
- `lib/marketplace/`: approvals, create, cancel, settle, and token refresh logic.

## Safety

- Treat `PRIVATE_KEY` and `MARKETPLACE_ACCESS_TOKEN` as secrets.
- Use a dedicated low-value wallet for testing and automation.
- Buying, canceling, and transferring are real blockchain actions.
- Approval helpers grant contract permissions and should be treated as write operations.
- If you only need market data, prefer read-only helpers first.

## Required environment variables

| Variable | Purpose |
| --- | --- |
| `PRIVATE_KEY` | Required for CLI flows, approvals, buys, listings, and transfers |
| `MARKETPLACE_ACCESS_TOKEN` | Required for authenticated marketplace actions like buy and create order |
| `SKYMAVIS_API_KEY` | Required for provider creation, CLI flows, read helpers, and marketplace calls |

## Safe starting points

These functions are read-only and are the best first step for exploration:

- `getAxieFloorPrice(apiKey)`
- `getMaterialFloorPrice(materialId, apiKey, quantity?)`
- `getAxieIdsFromAccount(address, provider)`
- `getAccountInfo(address, provider, apiKey)`
- `validateMaterialToken(materialId, apiKey)`
- `getTokenExpirationInfo(token)`

## Live write operations

These functions or scripts can change marketplace state or submit transactions:

- `approveWETH(wallet)`
- `approveMarketplaceContract(wallet)`
- `approveMaterialMarketplace(wallet)`
- `approveBatchTransfer(wallet)`
- `buyMarketplaceOrder(...)`
- `createMarketplaceOrder(...)`
- `cancelMarketplaceOrder(...)`
- `buyMaterialOrder(...)`
- `createMaterialMarketplaceOrder(...)`
- `cancelMaterialOrder(...)`
- `transferAxie(...)`
- `batchTransferAxies(...)`
- All scripts in `examples/` except read-only inspection snippets inside docs

## Repo map

- `index.ts`: public export surface for the package.
- `cli.ts`: interactive CLI menu for account info, approvals, buy/list/cancel flows, auctions, and transfers.
- `lib/axie.ts`: Axie-specific queries and helpers.
- `lib/material.ts`: Material-specific queries, validation, and floor price helpers.
- `lib/transfers.ts`: single and batch transfer helpers.
- `lib/marketplace/approve.ts`: approval helpers.
- `lib/marketplace/create-order.ts`: Axie listing and auction creation.
- `lib/marketplace/create-material-order.ts`: Material listing creation.
- `lib/marketplace/cancel-order.ts`: Axie listing cancellation.
- `lib/marketplace/cancel-material-order.ts`: Material listing cancellation.
- `lib/marketplace/settle-order.ts`: Axie purchase flow.
- `lib/marketplace/settle-material-order.ts`: Material purchase flow.
- `lib/marketplace/access-token.ts`: marketplace token refresh helpers.
- `examples/`: runnable live scripts for common automation patterns.
- `tests/`: Bun-based integration tests against live services.

## Common commands

- `npm run build`: build library and CLI.
- `npm run dev`: run the CLI in development mode.
- `npm run format`: format the repo with Biome.
- `npm run format:check`: check formatting without changing files.

Representative live tests:

- `AXIE_ID=1 bun test tests/axie-floor-price.test.ts --timeout 45000`
- `AXIE_ID=123456 PRICE=0.1 bun test tests/create-order-axie.test.ts --timeout 30000`
- `MATERIAL_ID=1099511627776 QUANTITY=5 PRICE=0.001 bun test tests/create-order-materials.test.ts --timeout 30000`

## Task routing

- Want to automate or build a bot: start with `README.md`, then `index.ts`, then `examples/README.md`.
- Want to understand CLI behavior: read `cli.ts`.
- Want marketplace internals: read `lib/marketplace/`.
- Want the shortest agent-readable summary: read `llms.txt`.
