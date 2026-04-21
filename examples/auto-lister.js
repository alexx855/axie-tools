import { parseEther, Wallet } from "ethers";
import {
  getAxieIdsFromAccount,
  getAxieFloorPrice,
  createMarketplaceOrder,
  approveMarketplaceContract,
  createProvider,
} from "axie-tools";
import "dotenv/config";

// Auto-lister bot
// Lists all owned Axies at floor price + markup percentage
//
// Usage:
//   node auto-lister.js [markupMultiplier]
//
// Examples:
//   node auto-lister.js         # List all at floor price (1.0x)
//   node auto-lister.js 1.1     # List all at floor + 10%
//   node auto-lister.js 0.95    # List all at 5% below floor (quick sell)

const MARKUP = parseFloat(process.argv[2] || "1.0");

if (isNaN(MARKUP) || MARKUP <= 0) {
  throw new Error("Markup multiplier must be a positive number");
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

const provider = createProvider(process.env.SKYMAVIS_API_KEY);
const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
const address = await wallet.getAddress();

// Get floor price
const floorPrice = await getAxieFloorPrice(process.env.SKYMAVIS_API_KEY);
if (!floorPrice) {
  throw new Error("Could not determine floor price");
}

const listingPrice = (parseFloat(floorPrice) * MARKUP).toFixed(6);
console.log(
  `Floor: ${floorPrice} WETH | Listing at: ${listingPrice} WETH (${MARKUP}x)`,
);

// Get all owned Axies
const axieIds = await getAxieIdsFromAccount(address, provider);
if (axieIds.length === 0) {
  throw new Error("No Axies found in wallet");
}
console.log(`Found ${axieIds.length} Axies to list`);

// Approve marketplace once
await approveMarketplaceContract(wallet);

// List each Axie
const currentBlock = await provider.getBlock("latest");
const startedAt = currentBlock.timestamp;
const expiredAt = startedAt + 15634800; // ~6 months (max listing duration)

let listed = 0;
let failed = 0;

for (const axieId of axieIds) {
  const orderData = {
    address,
    axieId: axieId.toString(),
    basePrice: parseEther(listingPrice).toString(),
    endedPrice: "0",
    startedAt,
    endedAt: 0,
    expiredAt,
  };

  const result = await createMarketplaceOrder(
    orderData,
    process.env.MARKETPLACE_ACCESS_TOKEN,
    wallet,
    process.env.SKYMAVIS_API_KEY,
  );

  if (result?.data && !result.errors) {
    listed++;
    console.log(
      `Listed Axie #${axieId} at ${listingPrice} WETH ($${result.data.createOrder.currentPriceUsd})`,
    );
  } else {
    failed++;
    console.error(
      `Failed Axie #${axieId}: ${result?.errors?.[0]?.message || "Unknown error"}`,
    );
  }
}

console.log(`Done. Listed: ${listed}, Failed: ${failed}`);
