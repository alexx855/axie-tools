import { buyMarketplaceOrder, approveWETH } from "axie-tools";
import { formatEther, JsonRpcProvider } from "ethers";
import "dotenv/config";

async function buyAxie() {
  if (!process.env.PRIVATE_KEY || !process.env.MARKETPLACE_ACCESS_TOKEN) {
    throw new Error(
      "Please set your PRIVATE_KEY, MARKETPLACE_ACCESS_TOKEN, and SKYMAVIS_DAPP_KEY in a .env file",
    );
  }

  // Initialize provider and wallet
  const provider = new JsonRpcProvider("https://api.roninchain.com/rpc");
  const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
  const address = await wallet.getAddress();

  console.log(`📬 Wallet address: ${address}`);

  // Get RON balance
  const balance = await provider.getBalance(address);
  console.log(`💰 RON Balance: ${formatEther(balance)}`);

  // Get axie id from command line args
  const args = process.argv.slice(2);
  if (args.length === 0) {
    throw new Error("Please provide an axie ID as argument");
  }
  const axieId = parseInt(args[0]);

  try {
    await approveWETH(wallet);

    const receipt = await buyMarketplaceOrder(
      axieId,
      wallet,
      process.env.MARKETPLACE_ACCESS_TOKEN,
    );
    if (receipt) {
      console.log("✅ Transaction successful! Hash:", receipt.hash);
      console.log(
        "🔗 View transaction: https://app.roninchain.com/tx/" + receipt.hash,
      );
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

buyAxie();
