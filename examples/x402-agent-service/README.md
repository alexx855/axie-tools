# x402 Agent Service Experiment

This example turns the read-only parts of `axie-tools` into a paid HTTP API for AI agents and automation clients. It is meant to test a revenue path that does not depend on marketplace referral fees.

The first branch is deliberately read-only:

- `GET /paid/axie-floor` returns the current Axie floor price.
- `GET /paid/material-floor?materialId=...&quantity=...` returns Material floor pricing.
- `GET /paid/account-info?address=...` returns balances, approvals, owned Axies, and Materials for a Ronin address.

No private key, marketplace token, approvals, buys, listings, cancellations, or transfers are exposed by the server.

## Why this exists

Agents need stable paid data and action APIs. x402 lets a client pay at the HTTP boundary before receiving the response, so Axie Tools can become a small paid primitive for:

- agent market scanners
- paid Ronin/Axie data endpoints
- MCP tool gateways that meter access per call
- future high-trust trading actions behind separate confirmation and policy layers

## Install

```bash
cd examples/x402-agent-service
cp .env.example .env
pnpm install
```

Edit `.env`:

```bash
SKYMAVIS_API_KEY=...
X402_PAY_TO=0xYourBaseSepoliaReceivingWallet
X402_NETWORK=eip155:84532
```

Use Base Sepolia while testing. Move to Base mainnet only after the service and pricing are proven.

## Run the server

```bash
pnpm dev
```

Health check:

```bash
curl http://localhost:4021/health
```

Requesting a paid endpoint without payment should return `402 Payment Required`:

```bash
curl -i http://localhost:4021/paid/axie-floor
```

## Test a paying client

Fund a low-value Base Sepolia wallet with test USDC, set:

```bash
EVM_PRIVATE_KEY=0x...
API_URL=http://localhost:4021/paid/axie-floor
```

Then run:

```bash
pnpm client
```

## Next revenue tests

- Add a tiny MCP server that exposes these paid endpoints as tools.
- Add per-endpoint pricing from env or a small config file.
- Add cached responses for floor-price calls so agents can buy fresh-enough data without hammering SkyMavis.
- Keep write operations in a separate service with explicit policy, allowlists, spend caps, and human confirmation.
