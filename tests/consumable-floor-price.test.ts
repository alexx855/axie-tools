import { test, expect } from "bun:test";
import { getConsumableFloorPrice } from "../index";

test("getConsumableFloorPrice works with quantity parameter", async () => {
  const { SKYMAVIS_API_KEY } = process.env;

  if (!SKYMAVIS_API_KEY) {
    throw new Error("Missing SKYMAVIS_API_KEY in .env file");
  }

  // Test consumable ID - using Cocochoco (ID: 1)
  const consumableId = "1";

  console.log("Testing getConsumableFloorPrice function...");

  // Test 1: No quantity (backward compatibility)
  console.log("1. Testing without quantity parameter...");
  const floorPriceNoQty = await getConsumableFloorPrice(
    consumableId,
    SKYMAVIS_API_KEY,
  );
  console.log("Floor price (no quantity):", floorPriceNoQty);

  // Should return a valid price or null
  expect(floorPriceNoQty === null || typeof floorPriceNoQty === "string").toBe(
    true,
  );

  if (floorPriceNoQty !== null) {
    expect(parseFloat(floorPriceNoQty)).toBeGreaterThan(0);
    console.log("✅ Basic floor price retrieval works");

    // Test 2: With small quantity
    console.log("2. Testing with quantity parameter (1)...");
    const floorPriceSmall = await getConsumableFloorPrice(
      consumableId,
      SKYMAVIS_API_KEY,
      1,
    );
    console.log("Floor price (qty 1):", floorPriceSmall);

    expect(
      floorPriceSmall === null || typeof floorPriceSmall === "string",
    ).toBe(true);

    if (floorPriceSmall !== null) {
      expect(parseFloat(floorPriceSmall)).toBeGreaterThan(0);
      console.log("✅ Quantity-aware floor price works");

      // Test 3: With larger quantity (might return different price or null)
      console.log("3. Testing with quantity 2 (max for testing)...");
      const floorPriceLarge = await getConsumableFloorPrice(
        consumableId,
        SKYMAVIS_API_KEY,
        2,
      );
      console.log("Floor price (qty 2):", floorPriceLarge);

      expect(
        floorPriceLarge === null || typeof floorPriceLarge === "string",
      ).toBe(true);

      if (floorPriceLarge !== null) {
        expect(parseFloat(floorPriceLarge)).toBeGreaterThan(0);
        console.log("✅ Quantity 2 floor price calculation works");
      } else {
        console.log("ℹ️ Quantity 2 not available (expected behavior)");
      }
    } else {
      console.log("ℹ️ No orders available for quantity 1 (market condition)");
    }
  } else {
    console.log("ℹ️ No orders available (market condition)");
  }
}, 15000);
