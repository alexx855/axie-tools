import { parseEther, Wallet } from "ethers";
import {
  getAxieIdsFromAccount,
  approveMarketplaceContract,
  createMarketplaceOrder,
  createProvider,
} from "axie-tools";
import "dotenv/config";

async function auction() {
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

  // Get CLI args: axieId startPrice endPrice durationInHours
  const args = process.argv.slice(2);
  const axieId = parseInt(args[0], 10);
  const startPrice = args[1];
  const endPrice = args[2];
  const durationHours = parseInt(args[3], 10);

  if (isNaN(axieId) || axieId < 1) {
    throw new Error("Please provide a valid axieID as the first argument");
  }
  if (!startPrice || !endPrice || isNaN(startPrice) || isNaN(endPrice)) {
    throw new Error("Please provide valid start and end prices in ETH");
  }
  if (isNaN(durationHours) || durationHours < 1 || durationHours > 168) {
    throw new Error("Please provide a valid duration in hours (1-168)");
  }

  // Check axie ownership
  const axieIds = await getAxieIdsFromAccount(address, provider);
  if (!axieIds.includes(axieId)) {
    throw new Error(`Axie ${axieId} is not owned by ${address}`);
  }

  // Ensure marketplace contract is approved
  await approveMarketplaceContract(wallet);

  // Prepare auction data
  const currentBlock = await provider.getBlock("latest");
  const startedAt = currentBlock.timestamp;
  const endedAt = startedAt + durationHours * 3600; // convert hours to seconds
  const expiredAt = startedAt + 15634800; // ~6 months (max allowed)

  const orderData = {
    address,
    axieId: axieId.toString(),
    basePrice: parseEther(startPrice).toString(),
    endedPrice: parseEther(endPrice).toString(),
    startedAt,
    endedAt,
    expiredAt,
  };

  // Create the auction
  const result = await createMarketplaceOrder(
    orderData,
    process.env.MARKETPLACE_ACCESS_TOKEN,
    wallet,
    process.env.SKYMAVIS_API_KEY,
  );

  if (result === null || result.errors || !result.data) {
    throw new Error(
      result?.errors?.[0]?.message || "Unknown error creating auction",
    );
  }

  console.log(`✅ Created auction for Axie ${axieId}!`);
  console.log(`Start price: ${startPrice} ETH`);
  console.log(`End price: ${endPrice} ETH`);
  console.log(`Duration: ${durationHours} hours`);
  console.log(
    `Current price in USD: ${result.data.createOrder.currentPriceUsd}`,
  );
}

auction().catch(console.error);
