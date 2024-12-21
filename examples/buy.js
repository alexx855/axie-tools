import { buyMarketplaceOrder, approveWETH } from "axie-tools";
import { ethers, utils } from 'ethers';
import * as dotenv from 'dotenv'

dotenv.config()

async function buyAxie() {
  if (!process.env.PRIVATE_KEY) {
    throw new Error('Please set your PRIVATE_KEY in a .env file')
  }

  // Initialize provider and wallet
  const provider = new ethers.providers.JsonRpcProvider('https://api.roninchain.com/rpc');
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const address = await wallet.getAddress();

  console.log(`📬 Wallet address: ${address}`);

  // Get RON balance
  const balance = await provider.getBalance(address);
  console.log(`💰 RON Balance: ${utils.formatEther(balance)}`);

  // Get axie id from command line args
  const args = process.argv.slice(2);
  if (args.length === 0) {
    throw new Error('Please provide an axie ID as argument');
  }
  const axieId = parseInt(args[0]);

  try {
    await approveWETH(wallet);
    const receipt = await buyMarketplaceOrder(axieId, wallet);
    if (receipt) {
      console.log('✅ Transaction successful! Hash:', receipt.transactionHash);
      console.log('🔗 View transaction: https://app.roninchain.com/tx/' + receipt.transactionHash);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

buyAxie();