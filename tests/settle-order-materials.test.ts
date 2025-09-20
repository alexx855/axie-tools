import { test, expect } from "bun:test";
import { buyMaterialOrder } from "../lib/marketplace/settle-material-order";
import { Wallet, Contract } from "ethers";
import { ensureMarketplaceToken, createProvider } from "../lib/utils";
import { validateMaterialToken } from "../lib/material";
import { approveWETH } from "../lib/marketplace/approve";
import { getWETHContract } from "../lib/contracts";

test("settle material order", async () => {
  const { PRIVATE_KEY, SKYMAVIS_API_KEY, MATERIAL_ID, QUANTITY } = process.env;

  if (!PRIVATE_KEY || !SKYMAVIS_API_KEY || !MATERIAL_ID) {
    throw new Error(
      "Missing required env vars: PRIVATE_KEY, SKYMAVIS_API_KEY, MATERIAL_ID",
    );
  }

  const provider = createProvider(SKYMAVIS_API_KEY);
  const wallet = new Wallet(PRIVATE_KEY, provider);

  console.log("🔍 Validating material token...");
  const materialInfo = await validateMaterialToken(
    MATERIAL_ID,
    SKYMAVIS_API_KEY,
  );
  if (!materialInfo) {
    console.warn("Material not found, skipping test");
    expect(true).toBe(true);
    return;
  }
  console.log(`✅ Found material: ${materialInfo.name}`);

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

  const receipt = await buyMaterialOrder(
    MATERIAL_ID,
    parseInt(QUANTITY || "1"),
    wallet,
    accessToken,
    SKYMAVIS_API_KEY,
  );

  if (receipt) {
    expect(receipt.status).toBe(1);
    console.log("✅ Material purchase completed successfully!");
  } else {
    console.log("ℹ️ No orders available to purchase");
    expect(true).toBe(true);
  }
}, 150000);
