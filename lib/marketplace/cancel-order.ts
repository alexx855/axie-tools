import { AbiCoder, Interface, Signer } from "ethers";
import { apiRequest, getMarketplaceApi, getGasPrice, type GasPriceOptions } from "../utils";
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

  const orderData = [
    orderToCancel.maker,
    orderToCancel.kind === "Sell" ? 1 : 0,
    [
      [
        orderToCancel.assets[0].erc === "Erc721" ? 1 : 0,
        orderToCancel.assets[0].address,
        +orderToCancel.assets[0].id,
        +orderToCancel.assets[0].quantity,
      ],
    ],
    orderToCancel.expiredAt,
    orderToCancel.paymentToken,
    orderToCancel.startedAt,
    orderToCancel.basePrice,
    orderToCancel.endedAt,
    orderToCancel.endedPrice,
    orderToCancel.expectedState || 0,
    orderToCancel.nonce,
    orderToCancel.marketFeePercentage,
  ];

  const encodedOrderData = AbiCoder.defaultAbiCoder().encode(
    [
      "(address maker, uint8 kind, (uint8 erc,address addr,uint256 id,uint256 quantity)[] assets, uint256 expiredAt, address paymentToken, uint256 startedAt, uint256 basePrice, uint256 endedAt, uint256 endedPrice, uint256 expectedState, uint256 nonce, uint256 marketFeePercentage)",
    ],
    [orderData],
  );

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
