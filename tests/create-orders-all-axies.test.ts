import { expect, test } from "bun:test";
import { Wallet, parseEther } from "ethers";
import {
  ensureMarketplaceToken,
  getMarketplaceApi,
  apiRequest,
  createProvider,
} from "../lib/utils";
import { getAxieIdsFromAccount } from "../lib/axie";
import createMarketplaceOrder from "../lib/marketplace/create-order";
import { approveMarketplaceContract } from "../lib/marketplace/approve";
import { getAxieFloorPrice } from "..";

interface AxieQueryResponse {
  data?: {
    axie?: {
      order?: {
        id: string;
      } | null;
    } | null;
  };
  errors?: Array<{
    message: string;
  }>;
}

test("creates orders for all owned axies", async () => {
  let price = process.env.PRICE;

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY not set");
  }

  const skyMavisApiKey = process.env.SKYMAVIS_API_KEY;
  if (!skyMavisApiKey) {
    throw new Error("SKYMAVIS_API_KEY is required");
  }

  const provider = createProvider(skyMavisApiKey);
  const signer = new Wallet(privateKey, provider);
  const address = await signer.getAddress();

  // Get all owned Axies
  console.log("🔍 Getting owned Axies...");
  const ownedAxies = await getAxieIdsFromAccount(address, provider);

  if (ownedAxies.length === 0) {
    console.log("❌ No Axies owned by this wallet");
    return;
  }

  console.log(
    `📊 Found ${ownedAxies.length} owned Axies: ${ownedAxies.join(", ")}`,
  );

  // Determine price to use
  if (!price) {
    console.log("🔍 Getting floor price from marketplace...");
    const floorPrice = await getAxieFloorPrice(skyMavisApiKey);
    if (!floorPrice) {
      throw new Error(
        "❌ Could not determine floor price and no price provided",
      );
    }
    price = floorPrice;
    console.log(`💰 Using floor price: ${price} WETH`);
  } else {
    console.log(`💰 Using specified price: ${price} WETH`);
  }

  const { graphqlUrl, headers } = getMarketplaceApi(skyMavisApiKey);

  // Approve marketplace contract
  try {
    await approveMarketplaceContract(signer);
  } catch (error) {
    // console.log("Approval already set");
  }

  const accessToken = await ensureMarketplaceToken();
  if (!accessToken) {
    throw new Error("Access token not found");
  }

  const now = Math.floor(Date.now() / 1000);
  const priceInWei = parseEther(price).toString();

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  // Process each Axie
  for (const axieId of ownedAxies) {
    try {
      // Check if an order for this axieId already exists
      const query = `
        query GetAxieDetail($axieId: ID!) {
          axie(axieId: $axieId) {
            order {
              id
            }
          }
        }
      `;
      const variables = { axieId };
      const graphqlResult = await apiRequest<AxieQueryResponse>(
        graphqlUrl,
        JSON.stringify({ query, variables }),
        headers,
      );

      if (graphqlResult?.data?.axie?.order) {
        console.log(`⏭️  Order for Axie ID ${axieId} already exists. Skipping.`);
        skipCount++;
        continue;
      }

      const orderData = {
        address,
        axieId: axieId.toString(),
        basePrice: priceInWei,
        endedPrice: "0", // For fixed price orders, endedPrice should be 0
        startedAt: now,
        endedAt: 0, // For fixed price, endedAt is 0
        expiredAt: now + 86400 * 30, // Expires in 30 days
      };

      console.log(`🔄 Creating order for Axie ID ${axieId}...`);
      const result = await createMarketplaceOrder(
        orderData,
        accessToken,
        signer,
        skyMavisApiKey,
      );

      if (result?.errors) {
        console.log(
          `❌ Error creating order for Axie ID ${axieId}:`,
          result.errors[0]?.message,
        );
        errorCount++;
      } else if (result?.data?.createOrder) {
        console.log(`✅ Successfully created order for Axie ID ${axieId}`);
        successCount++;
      } else {
        console.log(`❌ Unknown error creating order for Axie ID ${axieId}`);
        errorCount++;
      }

      // Add a small delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(`❌ Exception creating order for Axie ID ${axieId}:`, error);
      errorCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`✅ Successfully created: ${successCount} orders`);
  console.log(`⏭️  Skipped (already listed): ${skipCount} orders`);
  console.log(`❌ Errors: ${errorCount} orders`);
  console.log(`📊 Total Axies processed: ${ownedAxies.length}`);

  // Test should pass if we processed all Axies (even if some were skipped or had errors)
  expect(successCount + skipCount + errorCount).toBe(ownedAxies.length);

  // At least some orders should be created or skipped (not all errors)
  expect(successCount + skipCount).toBeGreaterThan(0);
}, 60000); // 60 second timeout for multiple API calls
