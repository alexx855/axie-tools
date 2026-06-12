import { isAddress, Wallet, formatEther } from "ethers";
import {
  getAxieIdsFromAccount,
  batchTransferAxies,
  createProvider,
} from "axie-tools";
import "dotenv/config";

async function batchTransfer() {
  const privateKey = process.env.PRIVATE_KEY;
  const skyMavisApiKey = process.env.SKYMAVIS_API_KEY;
  if (!privateKey || !skyMavisApiKey) {
    throw new Error(
      "Please set your PRIVATE_KEY and SKYMAVIS_API_KEY in a .env file",
    );
  }

  const provider = createProvider(skyMavisApiKey);
  const wallet = new Wallet(privateKey, provider);
  const fromAddress = await wallet.getAddress();

  console.log(`📬 From address: ${fromAddress}`);

  // Get RON balance
  const balance = await provider.getBalance(fromAddress);
  const balanceInRON = formatEther(balance);
  console.log(`💰 RON Balance: ${balanceInRON}`);

  if (parseFloat(balanceInRON) < 0.001) {
    throw new Error("Not enough RON to pay for the transaction");
  }

  // Get addressTo from command line args and validate
  const args = process.argv.slice(2);
  if (args.length === 0) {
    throw new Error("Please provide a recipient address as argument");
  }

  const toAddress = args[0].replace("ronin:", "0x");
  if (!isAddress(toAddress)) {
    throw new Error("Invalid recipient address");
  }

  console.log(`📫 To address: ${toAddress}`);

  // Get all axies ids from the account
  const axieIds = await getAxieIdsFromAccount(fromAddress, provider);
  console.log(`🐾 Number of Axies: ${axieIds.length}`);

  if (axieIds.length === 0) {
    console.log("No axies to transfer");
    return;
  }

  if (axieIds.length > 100) {
    console.log(
      "⚠️ Warning: Can only transfer up to 100 Axies at once, only transferring the first 100",
    );
    axieIds = axieIds.slice(0, 100);
  }

  console.log(`🆔 Transferring Axie IDs: ${axieIds.join(", ")}`);

  const receipt = await batchTransferAxies(wallet, toAddress, axieIds);
  if (!receipt) {
    throw new Error("Transaction failed");
  }

  console.log("✅ Transfer successful!");
  console.log(
    `🔗 View transaction: https://app.roninchain.com/tx/${receipt.hash}`,
  );
}

batchTransfer().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});
