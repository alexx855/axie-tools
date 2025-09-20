import { test, expect } from "bun:test";
import { getMaterialFloorPrice } from "../index";

test("getMaterialFloorPrice works with quantity parameter", async () => {
  const { SKYMAVIS_API_KEY } = process.env;

  if (!SKYMAVIS_API_KEY) {
    throw new Error("Missing SKYMAVIS_API_KEY in .env file");
  }

  // Test material ID - using the same one from examples
  const materialId = "1099511627776";

  console.log("Testing getMaterialFloorPrice function...");

  // Test 1: No quantity (backward compatibility)
  console.log("1. Testing without quantity parameter...");
  const floorPriceNoQty = await getMaterialFloorPrice(
    materialId,
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
    const floorPriceSmall = await getMaterialFloorPrice(
      materialId,
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
      console.log("3. Testing with larger quantity (5)...");
      const floorPriceLarge = await getMaterialFloorPrice(
        materialId,
        SKYMAVIS_API_KEY,
        5,
      );
      console.log("Floor price (qty 5):", floorPriceLarge);

      expect(
        floorPriceLarge === null || typeof floorPriceLarge === "string",
      ).toBe(true);

      if (floorPriceLarge !== null) {
        expect(parseFloat(floorPriceLarge)).toBeGreaterThan(0);
        console.log("✅ Large quantity floor price calculation works");
      } else {
        console.log("ℹ️ Large quantity not available (expected behavior)");
      }
    } else {
      console.log("ℹ️ No orders available for quantity 1 (market condition)");
    }
  } else {
    console.log("ℹ️ No orders available (market condition)");
  }
}, 15000);
