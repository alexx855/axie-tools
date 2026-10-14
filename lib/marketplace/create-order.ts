import { Wallet } from "ethers";
import { apiRequest, getMarketplaceApi } from "../utils";
import {
  getMarketplaceContract,
  getAxieContract,
  getWETHContract,
} from "../contracts";

// Types for Axie (ERC721) orders
const axieOrderTypes = {
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
  const {
    address,
    axieId,
    basePrice,
    endedPrice,
    startedAt,
    endedAt,
    expiredAt,
  } = orderData;
  if (BigInt(basePrice) <= 0n) {
    throw new Error("Axie listing price must be positive");
  }

  // Get contract addresses
  const AXIE_CONTRACT_ADDRESS = await getAxieContract().getAddress();
  const WETH_CONTRACT_ADDRESS = await getWETHContract().getAddress();
  const MARKETPLACE_CONTRACT_ADDRESS =
    await getMarketplaceContract().getAddress();

  // Shared domain for signing - EXACT structure from working raw data
  const domain = {
    name: "MarketGateway",
    version: "1",
    chainId: "2020", // ✅ CRITICAL FIX: Use string "2020" not number 2020
    verifyingContract: MARKETPLACE_CONTRACT_ADDRESS, // 0x3b3adf1422f84254b7fbb0e7ca62bd0865133fe3
  };

  const marketGatewayContract = getMarketplaceContract(signer);
  const nonce = await marketGatewayContract.makerNonce(address);

  // This is the object that gets signed
  const orderToSign = {
    maker: address,
    kind: "1", // Sell order
    assets: [
      {
        erc: "1", // ERC721
        addr: AXIE_CONTRACT_ADDRESS,
        id: axieId,
        quantity: "0", // ERC721 quantity is 0 for API compatibility
      },
    ],
    expiredAt: expiredAt.toString(),
    paymentToken: WETH_CONTRACT_ADDRESS,
    startedAt: startedAt.toString(),
    basePrice: basePrice,
    endedAt: endedAt.toString(),
    endedPrice: endedPrice,
    expectedState: "0",
    nonce: nonce.toString(),
    marketFeePercentage: "425", // Standard 4.25% fee
  };

  const signature = await signer.signTypedData(
    domain,
    axieOrderTypes,
    orderToSign,
  );

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

  // This is the object that gets sent to the API
  const variables = {
    order: {
      maker: address,
      nonce: Number(nonce),
      assets: [
        {
          id: axieId,
          address: AXIE_CONTRACT_ADDRESS,
          erc: "Erc721",
          quantity: "0", // API expects "0" for ERC721
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
