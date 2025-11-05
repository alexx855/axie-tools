import { parseEther, Wallet } from "ethers";
import {
  approveConsumableMarketplace,
  createConsumableMarketplaceOrder,
  buyConsumableOrder,
  cancelConsumableOrder,
  createProvider,
  getConsumableFloorPrice,
} from "axie-tools";
import "dotenv/config";

async function createConsumableOrder() {
  if (
    !process.env.PRIVATE_KEY ||
    !process.env.MARKETPLACE_ACCESS_TOKEN ||
    !process.env.SKYMAVIS_API_KEY
  ) {
    throw new Error(
      "Please set PRIVATE_KEY, MARKETPLACE_ACCESS_TOKEN, and SKYMAVIS_API_KEY in a .env file",
    );
  }

  const provider = createProvider(process.env.SKYMAVIS_API_KEY);
  const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
  const address = await wallet.getAddress();

  // Get consumableId from command line args
  const args = process.argv.slice(2);
  const consumableId = args[0];
  if (!consumableId) {
    throw new Error("Please provide a consumable ID as the first argument");
  }

  // Get quantity from command line args (optional - will use all available if not provided)
  let quantity = args[1];
  if (quantity && (isNaN(quantity) || parseInt(quantity) <= 0)) {
    throw new Error(
      "Quantity must be a positive number or omitted to use all available",
    );
  }

  // Get price from command line args (optional - will use floor price if not provided)
  let price = args[2];
  if (!price) {
    console.log(
      "🔍 No price provided, getting floor price from marketplace...",
    );
    const quantityForFloorPrice = quantity ? parseInt(quantity) : undefined;
    price = await getConsumableFloorPrice(
      consumableId,
      process.env.SKYMAVIS_API_KEY,
      quantityForFloorPrice,
    );
    if (!price) {
      throw new Error(
        "Could not determine floor price. Please provide a price as the third argument.",
      );
    }
    console.log(`💰 Using floor price: ${price} WETH`);
  } else if (isNaN(price)) {
    throw new Error(
      "Please provide a valid price in WETH as the third argument",
    );
  }

  // Ensure consumable marketplace contract is approved
  await approveConsumableMarketplace(wallet);

  // Prepare order data
  const currentBlock = await provider.getBlock("latest");
  const startedAt = currentBlock.timestamp;
  const expiredAt = startedAt + 15634800; // ~6 months

  const orderData = {
    address,
    consumableId: consumableId.toString(),
    quantity: quantity ? quantity.toString() : undefined, // undefined means use all available
    unitPrice: parseEther(price).toString(),
    endedUnitPrice: "0",
    startedAt,
    endedAt: 0,
    expiredAt,
  };

  console.log(
    `📦 Creating consumable order for Consumable ${consumableId}${quantity ? ` (qty: ${quantity})` : " (all available)"} at ${price} WETH...`,
  );

  // Create the order
  const result = await createConsumableMarketplaceOrder(
    orderData,
    process.env.MARKETPLACE_ACCESS_TOKEN,
    wallet,
    process.env.SKYMAVIS_API_KEY,
  );

  if (result === null || result.errors || !result.data) {
    const errorMessage =
      result?.errors?.[0]?.message || "Unknown error creating order";

    // Handle common expected errors
    if (errorMessage.includes("already listed")) {
      console.log("✅ Consumable already listed - this is expected behavior");
      return;
    }

    if (errorMessage.includes("wait a few seconds")) {
      console.log("⏳ Rate limited - please wait a few seconds and try again");
      return;
    }

    throw new Error(errorMessage);
  }

  console.log(
    `✅ Created consumable order for Consumable ${consumableId}${quantity ? ` (qty: ${quantity})` : " (all available)"}! Current price in USD: ${result.data.createOrder.currentPriceUsd}`,
  );
}

// Example usage:
// node consumable-order.js 1                   # List all available Cocochoco at floor price
// node consumable-order.js 1 1                 # List 1 Cocochoco at floor price
// node consumable-order.js 1 1 0.001           # List 1 Cocochoco at 0.001 WETH each
// node consumable-order.js 1 "" 0.002          # List all available at 0.002 WETH each
// node consumable-order.js 2                   # Premium Cocochoco (ID: 2)

createConsumableOrder().catch(console.error);
