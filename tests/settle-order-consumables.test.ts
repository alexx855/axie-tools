import { test, expect } from "bun:test";
import { buyConsumableOrder } from "../lib/marketplace/settle-consumable-order";
import { Wallet, Contract } from "ethers";
import { ensureMarketplaceToken, createProvider } from "../lib/utils";
import { validateConsumableToken } from "../lib/consumable";
import { approveWETH } from "../lib/marketplace/approve";
import { getWETHContract } from "../lib/contracts";

test("settle consumable order", async () => {
  const { PRIVATE_KEY, SKYMAVIS_API_KEY, CONSUMABLE_ID, QUANTITY } = process.env;

  if (!PRIVATE_KEY || !SKYMAVIS_API_KEY || !CONSUMABLE_ID) {
    throw new Error(
      "Missing required env vars: PRIVATE_KEY, SKYMAVIS_API_KEY, CONSUMABLE_ID",
    );
  }

  const provider = createProvider(SKYMAVIS_API_KEY);
  const wallet = new Wallet(PRIVATE_KEY, provider);

  console.log("🔍 Validating consumable token...");
  const consumableInfo = await validateConsumableToken(
    CONSUMABLE_ID,
    SKYMAVIS_API_KEY,
  );
  if (!consumableInfo) {
    console.warn("Consumable not found, skipping test");
    expect(true).toBe(true);
    return;
  }
  console.log(`✅ Found consumable: ${consumableInfo.name}`);

  await approveWETH(wallet);
  const accessToken = await ensureMarketplaceToken();

  // Check WETH balance
  const wethContract = getWETHContract(wallet);
  const wethBalance = await wethContract.balanceOf(wallet.address);
  console.log(
    `💰 WETH Balance: ${(Number(wethBalance) / 1e18).toFixed(6)} WETH`,
  );

  if (wethBalance === 0n) {
    console.warn("No WETH balance, skipping test");
    expect(true).toBe(true);
    return;
  }

  const receipt = await buyConsumableOrder(
    CONSUMABLE_ID,
    parseInt(QUANTITY || "1"),
    wallet,
    accessToken,
    SKYMAVIS_API_KEY,
  );

  if (receipt) {
    expect(receipt.status).toBe(1);
    console.log("✅ Consumable purchase completed successfully!");
  } else {
    console.log("ℹ️ No orders available to purchase");
    expect(true).toBe(true);
  }
}, 150000);
