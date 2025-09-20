import { test, expect } from "bun:test";
import { Wallet } from "ethers";
import cancelMaterialOrder from "../lib/marketplace/cancel-material-order";
import { createProvider } from "../lib/utils";

test("cancel material order", async () => {
  const { PRIVATE_KEY, SKYMAVIS_API_KEY, MATERIAL_ID } = process.env;

  if (!PRIVATE_KEY || !SKYMAVIS_API_KEY || !MATERIAL_ID) {
    throw new Error(
      "Missing required env vars: PRIVATE_KEY, SKYMAVIS_API_KEY, MATERIAL_ID",
    );
  }

  const provider = createProvider(SKYMAVIS_API_KEY);
  const wallet = new Wallet(PRIVATE_KEY, provider);

  const result = await cancelMaterialOrder(
    MATERIAL_ID,
    wallet,
    SKYMAVIS_API_KEY,
  );

  expect(result).toBeDefined();

  if ("message" in result) {
    console.log(`ℹ️ ${result.message}`);
  } else {
    console.log(
      `✅ Cancelled ${result.canceled} orders, ${result.failed} failed`,
    );
  }
});
