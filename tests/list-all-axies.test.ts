import { expect, test } from "bun:test";
import { getAxieIdsFromAccount, createProvider } from "..";

test("lists all owned axies using Multicall3", async () => {
  const skyMavisApiKey = process.env.SKYMAVIS_API_KEY;
  if (!skyMavisApiKey) {
    throw new Error("SKYMAVIS_API_KEY is required");
  }

  // Test address with 200+ Axies
  const address =
    process.env.TEST_ADDRESS || "0xA7D8cA624656922c633732fA2F327F504678d132";

  const provider = createProvider(skyMavisApiKey);

  console.log(`📋 Fetching all Axies for ${address}...`);
  const axieIds = await getAxieIdsFromAccount(address, provider);

  console.log(`✅ Found ${axieIds.length} Axies`);

  // Verify we got an array of numbers
  expect(Array.isArray(axieIds)).toBe(true);

  if (axieIds.length > 0) {
    // Verify all items are numbers
    axieIds.forEach((id) => {
      expect(typeof id === "number").toBe(true);
    });

    // Print comma-separated IDs (first 100 chars to keep output reasonable)
    const csvFormat = axieIds.join(",");
    const preview =
      csvFormat.length > 100 ? csvFormat.slice(0, 100) + "..." : csvFormat;
    console.log(`\n📋 CSV Format (preview):\n${preview}`);
    console.log(`\n✅ All ${axieIds.length} Axie IDs ready for export`);
  }
});
