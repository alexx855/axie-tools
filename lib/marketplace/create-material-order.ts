import { Wallet } from "ethers";
import { apiRequest, getMarketplaceApi, createProvider } from "../utils";
import {
  checkMaterialOwnership,
  type ICreateMaterialOrderData,
} from "../material";
import {
  getMaterialContract,
  getWETHContract,
  getMarketplaceContract,
} from "../contracts";
import type { ICreateOrderResult } from "../marketplace";

// Types for Material (ERC1155) orders - EXACT structure from working raw data
const materialOrderTypes = {
  Asset: [
    { name: "erc", type: "uint8" },
    { name: "addr", type: "address" },
    { name: "id", type: "uint256" },
    { name: "quantity", type: "uint256" },
  ],
  ERC1155Order: [
    { name: "maker", type: "address" },
    { name: "kind", type: "uint8" },
    { name: "asset", type: "Asset" },
    { name: "expiredAt", type: "uint256" },
    { name: "paymentToken", type: "address" },
    { name: "startedAt", type: "uint256" },
    { name: "unitPrice", type: "uint256" },
    { name: "endedAt", type: "uint256" },
    { name: "endedUnitPrice", type: "uint256" },
    { name: "expectedState", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
};

export async function createMaterialMarketplaceOrder(
  orderData: ICreateMaterialOrderData,
  accessToken: string,
  signer: Wallet,
  skyMavisApiKey: string,
  options?: { nonce?: string },
): Promise<ICreateOrderResult> {
  const {
    address,
    materialId,
    quantity: inputQuantity,
    unitPrice,
    endedUnitPrice,
    startedAt,
    endedAt,
    expiredAt,
  } = orderData;

  // Get contract addresses
  const MATERIAL_CONTRACT_ADDRESS = await getMaterialContract().getAddress();
  const WETH_CONTRACT_ADDRESS = await getWETHContract().getAddress();
  const MARKETPLACE_CONTRACT_ADDRESS =
    await getMarketplaceContract().getAddress();

  // Shared domain for signing - EXACT structure from working raw data
  const domain = {
    name: "MarketGateway",
    version: "1",
    chainId: "2020",
    verifyingContract: MARKETPLACE_CONTRACT_ADDRESS,
  };

  console.log(`🔍 Checking ownership for address: ${address}`);

  const ownership = await checkMaterialOwnership(
    materialId,
    address,
    skyMavisApiKey,
    accessToken,
  );

  if (!ownership) {
    throw new Error(
      `❌ Unable to verify ownership of material ${materialId}. Please check if you own this material.`,
    );
  }

  const ownedQuantity = ownership.total;

  if (ownedQuantity === 0) {
    throw new Error(
      `❌ You don't own any of material ${materialId}. You need to own at least 1 to create an order.`,
    );
  }

  // If quantity not provided, use all owned
  let quantity: string;
  if (!inputQuantity) {
    quantity = ownedQuantity.toString();
  } else {
    quantity = inputQuantity;
    if (parseInt(quantity) > ownedQuantity) {
      throw new Error(
        `❌ Insufficient quantity!
  • Requested: ${quantity}
  • Owned: ${ownedQuantity}
  • Cannot list more materials than you own.`,
      );
    }
  }

  // Material order to sign (exact structure from working example)
  const orderToSign = {
    maker: address.replace("ronin:", "0x"), // Use Ethereum address format for signing
    kind: "1", // Sell order
    asset: {
      // Note: 'asset' (singular) like working example
      erc: "2", // ERC1155
      addr: MATERIAL_CONTRACT_ADDRESS,
      id: materialId,
      quantity: quantity,
    },
    expiredAt: expiredAt.toString(),
    paymentToken: WETH_CONTRACT_ADDRESS,
    startedAt: startedAt.toString(),
    unitPrice: unitPrice, // Use unitPrice like working example
    endedAt: "0", // Fixed price listing
    endedUnitPrice: "0",
    expectedState: "0",
    nonce: options?.nonce || "0",
  };

  const provider = createProvider(skyMavisApiKey);
  const signerWithProvider = signer.connect(provider);

  const signature = await signerWithProvider.signTypedData(
    domain,
    materialOrderTypes,
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

  // API payload for material order (uses 'assets' array format for API)
  const variables = {
    order: {
      maker: address.replace("ronin:", "0x"), // Use 0x format for API
      nonce: 0, // Hardcoded as per working example
      assets: [
        {
          id: materialId,
          address: MATERIAL_CONTRACT_ADDRESS,
          erc: "Erc1155",
          quantity: quantity,
        },
      ],
      kind: "Sell",
      expectedState: "",
      basePrice: unitPrice, // API uses basePrice
      endedPrice: "0", // Fixed price listing
      startedAt: startedAt,
      endedAt: 0, // Fixed price listing
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
