import { Wallet } from "ethers";
import { cancelMarketplaceOrder, createProvider } from "axie-tools";
import "dotenv/config";

async function cancel() {
  if (!process.env.PRIVATE_KEY || !process.env.SKYMAVIS_API_KEY) {
    throw new Error(
      "Please set your PRIVATE_KEY and SKYMAVIS_API_KEY in a .env file",
    );
  }

  const provider = createProvider(process.env.SKYMAVIS_API_KEY);
  const wallet = new Wallet(process.env.PRIVATE_KEY, provider);

  const args = process.argv.slice(2);
  if (args.length !== 1) {
    throw new Error("Please provide an Axie ID as argument");
  }
  const axieId = args[0].trim();

  const receipt = await cancelMarketplaceOrder(
    axieId,
    wallet,
    process.env.SKYMAVIS_API_KEY,
  );
  console.log(
    `✅ Axie delisted! Transaction: https://app.roninchain.com/tx/${receipt.hash}`,
  );
}

cancel().catch(console.error);
