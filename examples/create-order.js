import { parseEther, Wallet } from "ethers";
import {
  getAxieIdsFromAccount,
  approveMarketplaceContract,
  createMarketplaceOrder,
  createProvider,
} from "axie-tools";
import "dotenv/config";

async function sale() {
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

  // Get axieId from command line args
  const args = process.argv.slice(2);
  const axieId = parseInt(args[0], 10);
  if (isNaN(axieId) || axieId < 1) {
    throw new Error("Please provide a valid axieID as the first argument");
  }

  // Get price from command line args (in ETH)
  const price = args[1];
  if (!price || isNaN(price)) {
    throw new Error(
      "Please provide a valid price in ETH as the second argument",
    );
  }

  // Check if the axieId is owned by the wallet
  const axieIds = await getAxieIdsFromAccount(address, provider);
  if (!axieIds.includes(axieId)) {
    throw new Error(`Axie ${axieId} is not owned by ${address}`);
  }

  // Ensure marketplace contract is approved
  await approveMarketplaceContract(wallet);

  // Prepare order data
  const currentBlock = await provider.getBlock("latest");
  const startedAt = currentBlock.timestamp;
  const expiredAt = startedAt + 15634800; // ~6 months

  const orderData = {
    address,
    axieId: axieId.toString(),
    basePrice: parseEther(price).toString(),
    endedPrice: "0",
    startedAt,
    endedAt: 0,
    expiredAt,
  };

  // Create the order
  const result = await createMarketplaceOrder(
    orderData,
    process.env.MARKETPLACE_ACCESS_TOKEN,
    wallet,
    process.env.SKYMAVIS_API_KEY,
  );

  if (result === null || result.errors || !result.data) {
    throw new Error(
      result?.errors?.[0]?.message || "Unknown error creating order",
    );
  }

  console.log(
    `✅ Listed Axie ${axieId}! Current price in USD: ${result.data.createOrder.currentPriceUsd}`,
  );
}

sale().catch(console.error);
