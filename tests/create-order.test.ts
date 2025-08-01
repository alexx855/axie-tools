import { expect, test } from "bun:test";
import { Wallet, parseEther } from "ethers";
import {
  ensureMarketplaceToken,
  getMarketplaceApi,
  apiRequest,
  createProvider,
} from "../lib/utils";
import createMarketplaceOrder from "../lib/marketplace/create-order";
import { approveMarketplaceContract } from "../lib/marketplace/approve";

test("creates a new order", async () => {
  const axieId = process.env.AXIE_ID;
  let price = process.env.PRICE;

  if (!axieId) {
    throw new Error(
      "Missing --axieId argument. Make sure to pass it like `bun test -- --axieId 123`",
    );
  }

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
  const skyMavisApiKey = process.env.SKYMAVIS_API_KEY;
  if (!skyMavisApiKey) {
    throw new Error("SKYMAVIS_API_KEY is required");
  }
  const { graphqlUrl, headers } = getMarketplaceApi(skyMavisApiKey);
  const graphqlResult = await apiRequest(
    graphqlUrl,
    JSON.stringify({ query, variables }),
    headers,
  );

  if (graphqlResult?.data?.axie?.order) {
    console.log(`Order for Axie ID ${axieId} already exists. Skipping test.`);
    test.skip("Order already exists");
    return;
  }

  if (!price) {
    price = "0.1";
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY not set");
  }

  const provider = createProvider(skyMavisApiKey);
  const signer = new Wallet(privateKey, provider);
  const address = await signer.getAddress();

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

  const orderData = {
    address,
    axieId,
    basePrice: priceInWei,
    endedPrice: priceInWei,
    startedAt: now,
    endedAt: 0, // For fixed price, endedAt is 0
    expiredAt: now + 86400 * 30, // Expires in 30 days
  };

  const result = await createMarketplaceOrder(
    orderData,
    accessToken,
    signer,
    skyMavisApiKey,
  );

  expect(result.errors).toBeUndefined();
  expect(result.data?.createOrder.hash).toBeString();
  expect(result.data?.createOrder.currentPriceUsd).toBeString();
}, 30000);
