import { AbiCoder, Contract, Interface, parseUnits, Signer } from "ethers";
import { apiRequest, getMarketplaceApi } from "../utils";
import APP_AXIE_ORDER_EXCHANGE from "@roninbuilders/contracts/app_axie_order_exchange";
import MARKET_GATEWAY from "@roninbuilders/contracts/market_gateway_proxy";

export default async function cancelMarketplaceOrder(
  axieId: number,
  signer: Signer,
  skyMavisApiKey: string,
  order?: any, // Add optional order parameter
) {
  let orderToCancel = order;

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

    console.time("GraphQL Fetch");
    const result = await apiRequest<IMarketplaceAxieOrderResult>(
      graphqlUrl,
      JSON.stringify({ query, variables }),
      headers,
    );
    console.timeEnd("GraphQL Fetch");
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

  const marketGatewayInterface = new Interface(MARKET_GATEWAY.proxy_abi);
  const gatewayPayload = marketGatewayInterface.encodeFunctionData(
    "interactWith",
    ["ORDER_EXCHANGE", orderExchangePayload],
  );

  console.time("Transaction Send and Wait");
  const tx = await signer.sendTransaction({
    to: MARKET_GATEWAY.address,
    data: gatewayPayload,
    gasPrice: parseUnits("30", "gwei"),
    nonce: await signer.getNonce(),
  });

  console.log("Transaction sent, waiting for receipt...");
  const receipt = await tx.wait();
  console.timeEnd("Transaction Send and Wait");
  return receipt;
}
