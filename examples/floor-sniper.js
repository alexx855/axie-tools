import { buyMarketplaceOrder, approveWETH, createProvider } from "axie-tools";
import { Wallet } from "ethers";
import "dotenv/config";

// Floor price sniper bot
// Polls the marketplace for the cheapest Axie and buys when it drops below your target price
//
// Usage:
//   node floor-sniper.js <targetPriceETH> [pollIntervalSeconds]
//
// Example:
//   node floor-sniper.js 0.001 30

const TARGET_PRICE = parseFloat(process.argv[2]);
const POLL_INTERVAL = (parseInt(process.argv[3]) || 30) * 1000;

if (isNaN(TARGET_PRICE) || TARGET_PRICE <= 0) {
  throw new Error("Provide a target price in WETH as the first argument");
}

if (
  !process.env.PRIVATE_KEY ||
  !process.env.MARKETPLACE_ACCESS_TOKEN ||
  !process.env.SKYMAVIS_API_KEY
) {
  throw new Error(
    "Set PRIVATE_KEY, MARKETPLACE_ACCESS_TOKEN, and SKYMAVIS_API_KEY in .env",
  );
}

// Note: MARKETPLACE_ACCESS_TOKEN expires periodically.
// For long-running bots, use refreshToken() and getTokenExpirationInfo()
// from axie-tools to keep the token fresh.

const provider = createProvider(process.env.SKYMAVIS_API_KEY);
const wallet = new Wallet(process.env.PRIVATE_KEY, provider);

// Fetches the cheapest listed Axie with its ID and price
async function getCheapestAxie(skyMavisApiKey) {
  const response = await fetch(
    "https://api-gateway.skymavis.com/graphql/axie-marketplace",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": skyMavisApiKey,
      },
      body: JSON.stringify({
        query: `query GetAxieLatest($from: Int!, $size: Int!, $sort: SortBy, $auctionType: AuctionType) {
          axies(from: $from, size: $size, sort: $sort, auctionType: $auctionType) {
            results {
              id
              order { currentPrice expiredAt }
            }
          }
        }`,
        variables: { from: 0, size: 5, sort: "PriceAsc", auctionType: "Sale" },
      }),
    },
  );

  const { data } = await response.json();
  const axies = (data?.axies?.results || []).filter(
    (a) => a.order?.currentPrice && a.order.expiredAt * 1000 > Date.now(),
  );

  if (axies.length === 0) return null;

  const cheapest = axies[0];
  return {
    id: parseInt(cheapest.id),
    price: Number(cheapest.order.currentPrice) / 1e18,
  };
}

// Approve WETH once before starting the loop
console.log("Approving WETH for marketplace...");
await approveWETH(wallet);

console.log(
  `Sniping Axies below ${TARGET_PRICE} WETH (polling every ${POLL_INTERVAL / 1000}s)`,
);

async function poll() {
  const timestamp = new Date().toISOString();
  const cheapest = await getCheapestAxie(process.env.SKYMAVIS_API_KEY);

  if (!cheapest) {
    console.log(`[${timestamp}] No listings found`);
    return;
  }

  console.log(
    `[${timestamp}] Floor: ${cheapest.price.toFixed(6)} WETH (Axie #${cheapest.id})`,
  );

  if (cheapest.price <= TARGET_PRICE) {
    console.log(`Target hit! Buying Axie #${cheapest.id}...`);
    const receipt = await buyMarketplaceOrder(
      cheapest.id,
      wallet,
      process.env.MARKETPLACE_ACCESS_TOKEN,
      process.env.SKYMAVIS_API_KEY,
    );
    if (receipt) {
      console.log(`Bought! TX: https://app.roninchain.com/tx/${receipt.hash}`);
    }
  }
}

// Poll loop
while (true) {
  await poll();
  await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
}
