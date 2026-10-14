import { Interface, Signer } from "ethers";
import { encodeAxieOrderData, validateAxieOrder } from "../axie";
import {
  apiRequest,
  getMarketplaceApi,
  getGasPrice,
  type GasPriceOptions,
} from "../utils";
import { getMarketplaceContract } from "../contracts";

// We need to access the APP_AXIE_ORDER_EXCHANGE ABI directly since it's not wrapped in contracts.ts yet
import APP_AXIE_ORDER_EXCHANGE from "@roninbuilders/contracts/app_axie_order_exchange";

export interface CancelMarketplaceOrderOptions extends GasPriceOptions {
  /** Pre-fetched order data. If not provided, will be fetched from the API */
  order?: any;
}

export default async function cancelMarketplaceOrder(
  axieId: number,
  signer: Signer,
  skyMavisApiKey: string,
  options?: CancelMarketplaceOrderOptions,
) {
  let orderToCancel = options?.order;

  if (!orderToCancel) {
    const query = `
            query GetAxieDetail($axieId: ID!) {
              axie(axieId: $axieId) {
                id
                order {
                  ... on Order {
                    id
                    maker
                    kind
                    assets {
                      ... on Asset {
                        erc
                        address
                        id
                        quantity
                        orderId
                      }
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
            }
          `;

    interface IMarketplaceAxieOrderResult {
      data?: {
        axie: {
          id: string;
          order: any | null;
        };
        errors?: Array<{
          message: string;
        }>;
      };
    }

    const variables = {
      axieId,
    };

    const { graphqlUrl, headers } = getMarketplaceApi(skyMavisApiKey);

    const result = await apiRequest<IMarketplaceAxieOrderResult>(
      graphqlUrl,
      JSON.stringify({ query, variables }),
      headers,
    );

    if (
      result === null ||
      result.data === undefined ||
      result.data.axie.order == null
    ) {
      throw new Error(`Could not find an active order for Axie ID: ${axieId}`);
    }

    orderToCancel = result.data.axie.order;
  }

  // Snapshot before the signer await can yield to code holding the cached order.
  const snapshot = structuredClone(orderToCancel);
  const order = await validateAxieOrder(
    snapshot,
    axieId,
    await signer.getAddress(),
  );
  const encodedOrderData = encodeAxieOrderData(order);

  const axieOrderExchangeInterface = new Interface(APP_AXIE_ORDER_EXCHANGE.abi);
  const orderExchangePayload = axieOrderExchangeInterface.encodeFunctionData(
    "cancelOrder",
    [encodedOrderData],
  );

  const marketGatewayContract = getMarketplaceContract(signer);

  const gasPrice = await getGasPrice(signer, options);

  console.time("Transaction Send and Wait");
  const tx = await marketGatewayContract.interactWith(
    "ORDER_EXCHANGE",
    orderExchangePayload,
    {
      gasPrice,
    },
  );

  const receipt = await tx.wait();
  console.timeEnd("Transaction Send and Wait");
  return receipt;
}
