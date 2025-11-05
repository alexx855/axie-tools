import { test, expect } from "bun:test";
import { Wallet } from "ethers";
import cancelConsumableOrder from "../lib/marketplace/cancel-consumable-order";
import { createProvider } from "../lib/utils";

test("cancel consumable order", async () => {
  const { PRIVATE_KEY, SKYMAVIS_API_KEY, CONSUMABLE_ID } = process.env;

  if (!PRIVATE_KEY || !SKYMAVIS_API_KEY || !CONSUMABLE_ID) {
    throw new Error(
      "Missing required env vars: PRIVATE_KEY, SKYMAVIS_API_KEY, CONSUMABLE_ID",
    );
  }

  const provider = createProvider(SKYMAVIS_API_KEY);
  const wallet = new Wallet(PRIVATE_KEY, provider);

  const result = await cancelConsumableOrder(
    CONSUMABLE_ID,
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
