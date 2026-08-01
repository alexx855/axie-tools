import { buyMarketplaceOrder, approveWETH, createProvider } from "axie-tools";
import { formatEther, parseEther, Wallet } from "ethers";
import "dotenv/config";

async function buyAxie() {
  if (
    !process.env.PRIVATE_KEY ||
    !process.env.MARKETPLACE_ACCESS_TOKEN ||
    !process.env.SKYMAVIS_API_KEY
  ) {
    throw new Error(
      "Please set your PRIVATE_KEY, MARKETPLACE_ACCESS_TOKEN, and SKYMAVIS_API_KEY in a .env file",
    );
  }

  // Initialize provider and wallet
  const provider = createProvider(process.env.SKYMAVIS_API_KEY);
  const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
  const address = await wallet.getAddress();

  console.log(`📬 Wallet address: ${address}`);

  // Get RON balance
  const balance = await provider.getBalance(address);
  console.log(`💰 RON Balance: ${formatEther(balance)}`);

  // Get axie id from command line args
  const args = process.argv.slice(2);
  if (args.length < 2) {
    throw new Error("Please provide an axie ID and maximum price in WETH");
  }
  const axieId = parseInt(args[0]);
  const maxPrice = parseEther(args[1]);
  if (maxPrice <= 0n) {
    throw new Error("Maximum price must be positive");
  }

  try {
    console.log(`🛒 Approving WETH for marketplace...`);
    await approveWETH(wallet);

    console.log(`🛒 Buying Axie ${axieId}...`);
    const receipt = await buyMarketplaceOrder(
      axieId,
      wallet,
      process.env.MARKETPLACE_ACCESS_TOKEN,
      process.env.SKYMAVIS_API_KEY,
      { maxPrice },
    );
    if (receipt) {
      console.log(
        "🔗 View transaction: https://app.roninchain.com/tx/" + receipt.hash,
      );
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

buyAxie();
