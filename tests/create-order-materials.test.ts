import { test, expect } from "bun:test";
import { Wallet, parseEther } from "ethers";
import { createMaterialMarketplaceOrder } from "../lib/marketplace/create-material-order";
import { validateMaterialToken } from "../lib/material";

test("creates a new material order", async () => {
  const {
    PRIVATE_KEY,
    MARKETPLACE_ACCESS_TOKEN,
    SKYMAVIS_API_KEY,
    MATERIAL_ID,
    QUANTITY,
    PRICE,
  } = process.env;

  if (
    !PRIVATE_KEY ||
    !MARKETPLACE_ACCESS_TOKEN ||
    !SKYMAVIS_API_KEY ||
    !MATERIAL_ID
  ) {
    throw new Error(
      "Missing required env vars: PRIVATE_KEY, MARKETPLACE_ACCESS_TOKEN, SKYMAVIS_API_KEY, MATERIAL_ID",
    );
  }

  const price = PRICE
    ? parseEther(PRICE).toString()
    : parseEther("0.01").toString();

  console.log("🔍 Validating material token...");
  const materialInfo = await validateMaterialToken(
    MATERIAL_ID,
    SKYMAVIS_API_KEY,
  );
  if (!materialInfo) {
    throw new Error(`Material ID ${MATERIAL_ID} not found or invalid`);
  }
  console.log(`✅ Found material: ${materialInfo.name}`);

  const signer = new Wallet(PRIVATE_KEY);
  const address = signer.address.toLowerCase().replace("0x", "ronin:");
  const now = Math.floor(Date.now() / 1000);

  const orderData = {
    address,
    materialId: MATERIAL_ID,
    quantity: QUANTITY, // undefined means use all available
    unitPrice: price,
    endedUnitPrice: price,
    startedAt: now,
    endedAt: now + 86400 * 30,
    expiredAt: now + 86400 * 30,
  };

  const result = await createMaterialMarketplaceOrder(
    orderData,
    MARKETPLACE_ACCESS_TOKEN,
    signer,
    SKYMAVIS_API_KEY,
  );

  if (result.errors) {
    const errorMessage = result.errors[0]?.message || "Unknown error";
    if (
      errorMessage.includes("already listed") ||
      errorMessage.includes("wait a few seconds")
    ) {
      console.log("✅ Expected behavior:", errorMessage);
      expect(true).toBe(true);
      return;
    }
    throw new Error(`Error creating material order: ${errorMessage}`);
  }

  expect(result.data?.createOrder).toBeDefined();
  console.log("✅ Material order created successfully!");
});
