import { ethers } from 'ethers';
import { cancelMarketplaceOrder } from "axie-tools";
import 'dotenv/config'

async function cancel() {
    if (!process.env.PRIVATE_KEY) {
        throw new Error('Please set your PRIVATE_KEY in a .env file')
    }

    const provider = new ethers.providers.JsonRpcProvider('https://api.roninchain.com/rpc');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    const args = process.argv.slice(2);
    if (args.length !== 1) {
        throw new Error('Please provide an Axie ID as argument');
    }
    const axieId = args[0].trim();

    const receipt = await cancelMarketplaceOrder(axieId, wallet);
    console.log(`✅ Axie delisted! Transaction: https://app.roninchain.com/tx/${receipt.transactionHash}`);
}

cancel().catch(console.error);