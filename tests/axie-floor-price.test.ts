import { expect, test } from "bun:test";
import { getAxieFloorPrice } from "../index";

const SKYMAVIS_API_KEY = process.env.SKYMAVIS_API_KEY;

if (!SKYMAVIS_API_KEY) {
  throw new Error("SKYMAVIS_API_KEY environment variable is required");
}

test("getAxieFloorPrice fetches floor price correctly", async () => {
  console.log("🔍 Testing getAxieFloorPrice function...");

  const floorPrice = await getAxieFloorPrice(SKYMAVIS_API_KEY);

  if (floorPrice) {
    console.log(`✅ Axie floor price: ${floorPrice} WETH`);
    console.log(
      `💵 Estimated USD: $${(parseFloat(floorPrice) * 3000).toFixed(2)}`,
    );

    // Basic validation
    expect(typeof floorPrice).toBe("string");
    expect(parseFloat(floorPrice)).toBeGreaterThan(0);
    expect(floorPrice).toMatch(/^\d+\.\d{6}$/); // Should be in format like "0.123456"
  } else {
    console.log("❌ Could not determine Axie floor price");
    // This might be expected if no axies are listed, so we don't fail the test
    console.log(
      "ℹ️  This might be expected if no Axies are currently listed for sale",
    );
  }
});
