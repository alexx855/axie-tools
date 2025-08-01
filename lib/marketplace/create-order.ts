import { Wallet } from "ethers";
import AXIE_PROXY from "@roninbuilders/contracts/axie_proxy";
import WRAPPED_ETHER from "@roninbuilders/contracts/wrapped_ether";
import MARKETPLACE_GATEWAY_PROXY from "@roninbuilders/contracts/market_gateway_proxy";
import { apiRequest, getMarketplaceApi } from "../utils";

export interface ICreateOrderData {
  address: string;
  axieId: string;
  basePrice: string;
  endedPrice: string;
  startedAt: number;
  endedAt: number;
  expiredAt: number;
}

export interface ICreateOrderResult {
  data?: {
    createOrder: {
      hash: string;
      currentPriceUsd: string;
    };
  };
  errors?: Array<{
    message: string;
  }>;
}

export default async function createMarketplaceOrder(
  orderData: ICreateOrderData,
  accessToken: string,
  signer: Wallet,
  skyMavisApiKey: string,
) {
  const { address, axieId, basePrice, endedPrice, startedAt, endedAt, expiredAt } = orderData;

  const types = {
    Asset: [
      { name: "erc", type: "uint8" },
      { name: "addr", type: "address" },
      { name: "id", type: "uint256" },
      { name: "quantity", type: "uint256" },
    ],
    Order: [
      { name: "maker", type: "address" },
      { name: "kind", type: "uint8" },
      { name: "assets", type: "Asset[]" },
      { name: "expiredAt", type: "uint256" },
      { name: "paymentToken", type: "address" },
      { name: "startedAt", type: "uint256" },
      { name: "basePrice", type: "uint256" },
      { name: "endedAt", type: "uint256" },
      { name: "endedPrice", type: "uint256" },
      { name: "expectedState", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "marketFeePercentage", type: "uint256" },
    ],
  };

  const domain = {
    name: "MarketGateway",
    version: "1",
    chainId: "2020",
    verifyingContract: MARKETPLACE_GATEWAY_PROXY.address,
  };

  // This is the object that gets signed, structured to match the working curl example
  const orderToSign = {
    maker: address,
    kind: "1",
    assets: [
      {
        erc: "1",
        addr: AXIE_PROXY.address,
        id: axieId,
        quantity: "0",
      },
    ],
    expiredAt: expiredAt.toString(),
    paymentToken: WRAPPED_ETHER.address,
    startedAt: startedAt.toString(),
    basePrice: basePrice,
    endedAt: endedAt.toString(),
    endedPrice: endedPrice,
    expectedState: "0",
    nonce: "0",
    marketFeePercentage: "425",
  };

  const signature = await signer.signTypedData(domain, types, orderToSign);

  const query = `
        mutation CreateOrder($order: InputOrder!, $signature: String!) {
          createOrder(order: $order, signature: $signature) {
            ...OrderInfo
            __typename
          }
        }
        fragment OrderInfo on Order {
          ...PartialOrderFields
          makerProfile {
            name
            addresses {
              ronin
              __typename
            }
            __typename
          }
          assets {
            erc
            address
            id
            quantity
            orderId
            __typename
          }
          __typename
        }
        fragment PartialOrderFields on Order {
          id
          maker
          kind
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
          assets {
            erc
            address
            id
            quantity
            orderId
            __typename
          }
          __typename
        }
      `;

  // This is the object that gets sent to the API, structured to match the working curl example
  const variables = {
    order: {
      maker: address,
      nonce: 0,
      assets: [
        {
          id: axieId,
          address: AXIE_PROXY.address,
          erc: "Erc721",
          quantity: "0",
        },
      ],
      kind: "Sell",
      expectedState: "",
      basePrice: basePrice,
      endedPrice: endedPrice,
      startedAt: startedAt,
      endedAt: endedAt,
      expiredAt: expiredAt,
    },
    signature,
  };

  const { graphqlUrl, headers: apiHeaders } = getMarketplaceApi(skyMavisApiKey);
  const headers: Record<string, string> = {
    ...apiHeaders,
    authorization: `Bearer ${accessToken}`,
  };

  const result = await apiRequest<ICreateOrderResult>(
    graphqlUrl,
    JSON.stringify({
      operationName: "CreateOrder",
      query,
      variables,
    }),
    headers,
  );
  return result;
}
