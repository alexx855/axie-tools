import { describe, it, expect, jest, beforeAll } from "bun:test";
import { Wallet } from "ethers";
import cancelMarketplaceOrder from "../lib/marketplace/cancel-order";
import { createProvider, getMarketplaceApi } from "../lib/utils";

describe("cancelMarketplaceOrder", () => {
  let wallet: Wallet;
  let skyMavisApiKey: string | undefined;

  beforeAll(() => {
    if (!process.env.PRIVATE_KEY) {
      throw new Error("Please set your PRIVATE_KEY in a .env file");
    }

    skyMavisApiKey = process.env.SKYMAVIS_API_KEY;
    if (!skyMavisApiKey) {
      throw new Error("SKYMAVIS_API_KEY is required");
    }

    const provider = createProvider(skyMavisApiKey);
    wallet = new Wallet(process.env.PRIVATE_KEY, provider);
  });

  it("should cancel an order", async () => {
    if (!skyMavisApiKey) {
      console.warn("Skipping test: SKYMAVIS_API_KEY not set.");
      return;
    }

    const axieIdFromEnv = process.env.AXIE_ID;
    let axieIdToCancel: number | undefined = axieIdFromEnv
      ? Number(axieIdFromEnv)
      : undefined;
    let orderToCancel: any;

    const address = await wallet.getAddress();
    let query;
    let variables;

    if (axieIdToCancel) {
      console.log(`Searching for order with Axie ID: ${axieIdToCancel}`);
      query = `
        query GetAxieDetail($axieId: ID!) {
          axie(axieId: $axieId) {
            order {
              id
              maker
              kind
              assets {
                erc
                address
                id
                quantity
                orderId
              }
              expiredAt
              paymentToken
              startedAt
              basePrice
              endedAt
              endedPrice
              expectedState
              nonce
              marketFeePercentage
              signature
              hash
              duration
              timeLeft
              currentPrice
              suggestedPrice
              currentPriceUsd
            }
          }
        }
      `;
      variables = { axieId: axieIdToCancel.toString() };
    } else {
      throw new Error(
        "Axie ID to cancel is not provided. Please set AXIE_ID in your environment variables.",
      );
    }

    const { graphqlUrl, headers } = getMarketplaceApi(skyMavisApiKey);
    const fetchHeaders = {
      ...headers,
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
    };

    const result = await fetch(graphqlUrl, {
      method: "POST",
      headers: fetchHeaders,
      body: JSON.stringify({ query, variables }),
    });

    const jsonResult = await result.json();

    orderToCancel = jsonResult.data?.axie?.order;

    if (!orderToCancel) {
      console.warn("No active order found. Skipping test.");
      return;
    }

    const receipt = await cancelMarketplaceOrder(
      axieIdToCancel!,
      wallet,
      skyMavisApiKey,
      orderToCancel,
    );
    expect(receipt).toBeDefined();
    console.log(
      `Order cancelled successfully for Axie ID: ${axieIdToCancel}`,
      receipt,
    );
  });
});
