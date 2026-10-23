import { AbiCoder, JsonRpcProvider, formatEther, getAddress } from "ethers";
import {
  getAxieContract,
  getMulticall3Contract,
  getWETHContract,
} from "./contracts";
import { apiRequest, getMarketplaceApi } from "./utils";
import type {
  IOrder,
  IAsset,
  ICancellationResult,
  ICreateOrderResult,
  IOperationResult,
} from "./marketplace";
import { ORDER_FRAGMENTS } from "./marketplace";

// Re-export marketplace types for backward compatibility
export type {
  IOrder,
  IAsset,
  ICancellationResult,
  ICreateOrderResult,
  IOperationResult,
};
export type Order = IOrder;
export type Asset = IAsset;
export type CreateOrderResult = ICreateOrderResult;
export type OperationResult = IOperationResult;
export type CancellationResult = ICancellationResult;

// Axie-specific TypeScript interfaces

export interface CreateOrderData {
  address: string;
  axieId?: string;
  basePrice?: string;
  endedPrice?: string;
  startedAt: number;
  endedAt: number;
  expiredAt: number;
}

export interface ICreateOrderData {
  address: string;
  axieId: string;
  basePrice: string;
  endedPrice: string;
  startedAt: number;
  endedAt: number;
  expiredAt: number;
}

// Axie GraphQL fragments and queries

export const AXIE_FRAGMENTS = `
  fragment AxieDetail on Axie {
    id
    order {
      ...OrderInfo
      __typename
    }
    __typename
  }
`;

export const AXIE_QUERIES = {
  GET_AXIE_DETAIL: `
    query GetAxieDetail($axieId: ID!) {
      axie(axieId: $axieId) {
        ...AxieDetail
        __typename
      }
    }
    ${AXIE_FRAGMENTS}
    ${ORDER_FRAGMENTS}
  `,
};

// Axie utility functions

export async function getAxieIdsFromAccount(
  address: string,
  provider: JsonRpcProvider,
) {
  const axieContract = getAxieContract(provider);
  const multicall3Contract = getMulticall3Contract(provider);

  // Get axies balance for the address
  const axiesBalance = await axieContract.balanceOf(address);

  if (axiesBalance === 0n) {
    return [];
  }

  const balanceNum = Number(axiesBalance);
  const axieContractAddress = await axieContract.getAddress();

  // Create array of calls for tokenOfOwnerByIndex
  const calls = Array.from({ length: balanceNum }, (_, i) => ({
    target: axieContractAddress,
    callData: axieContract.interface.encodeFunctionData("tokenOfOwnerByIndex", [
      address,
      i,
    ]),
  }));

  // Execute multicall using tryAggregate (read-only version) via staticCall
  const results = await multicall3Contract.tryAggregate.staticCall(
    false,
    calls,
  );

  // Decode results
  const axieIds: number[] = [];
  for (const result of results) {
    if (result.success) {
      try {
        const decoded = axieContract.interface.decodeFunctionResult(
          "tokenOfOwnerByIndex",
          result.returnData,
        );
        axieIds.push(Number(decoded[0]));
      } catch (error) {
        // Skip failed decoding
      }
    }
  }

  return axieIds;
}

interface IGetAxieDetail {
  data?: {
    axie: {
      id: string;
      order: IOrder;
    };
  };
  errors?: {
    message: string;
  };
}

/**
 * Get axie details from the marketplace API
 */
export async function getAxieDetails(
  axieId: number,
  accessToken: string,
  skyMavisApiKey: string,
): Promise<IOrder | null> {
  const variables = { axieId };
  const { graphqlUrl, headers: apiHeaders } = getMarketplaceApi(skyMavisApiKey);
  const headers: Record<string, string> = {
    ...apiHeaders,
    authorization: `Bearer ${accessToken}`,
  };

  try {
    const results = await apiRequest<IGetAxieDetail>(
      graphqlUrl,
      JSON.stringify({
        query: AXIE_QUERIES.GET_AXIE_DETAIL,
        variables,
      }),
      headers,
    );
    return results.data?.axie.order || null;
  } catch (error) {
    console.error("Error fetching axie details:", error);
    return null;
  }
}

/** Snapshot and bind an Axie sell order to the caller's requested asset. */
export async function validateAxieOrder(
  order: IOrder,
  axieId: number,
  maker?: string,
): Promise<IOrder> {
  // Never validate one version of a caller-owned order and submit another.
  const snapshot = structuredClone(order);
  if (!Number.isSafeInteger(axieId) || axieId < 0) {
    throw new Error("Invalid requested Axie ID");
  }
  if (
    snapshot.kind !== "Sell" ||
    !Array.isArray(snapshot.assets) ||
    snapshot.assets.length !== 1 ||
    snapshot.assets[0].erc !== "Erc721"
  ) {
    throw new Error("Expected a single Axie sell order");
  }
  const asset = snapshot.assets[0];
  const id = BigInt(asset.id);
  const quantity = BigInt(asset.quantity);
  if (id !== BigInt(axieId) || (quantity !== 0n && quantity !== 1n)) {
    throw new Error("Order does not match the requested Axie");
  }
  const normalizeAddress = (address: string) =>
    getAddress(address.replace(/^ronin:/i, "0x"));
  const [axieAddress, wethAddress] = await Promise.all([
    getAxieContract().getAddress(),
    getWETHContract().getAddress(),
  ]);
  if (
    normalizeAddress(asset.address) !== normalizeAddress(axieAddress) ||
    normalizeAddress(snapshot.paymentToken) !== normalizeAddress(wethAddress)
  ) {
    throw new Error("Order must use the Axie contract and WETH");
  }
  if (maker && normalizeAddress(snapshot.maker) !== normalizeAddress(maker)) {
    throw new Error("Order maker does not match the signer");
  }
  asset.address = normalizeAddress(asset.address);
  asset.id = id.toString();
  asset.quantity = quantity.toString();
  snapshot.maker = normalizeAddress(snapshot.maker);
  snapshot.paymentToken = normalizeAddress(snapshot.paymentToken);
  return snapshot;
}

/** Encode order data for Axie (ERC721) orders. */
export function encodeAxieOrderData(order: IOrder): string {
  const orderTypes = [
    "(address maker, uint8 kind, (uint8 erc,address addr,uint256 id,uint256 quantity)[] assets, uint256 expiredAt, address paymentToken, uint256 startedAt, uint256 basePrice, uint256 endedAt, uint256 endedPrice, uint256 expectedState, uint256 nonce, uint256 marketFeePercentage)",
  ];

  const orderData = [
    order.maker,
    1, // kind: sell order
    [
      [
        1, // ERC721 type
        order.assets[0].address,
        BigInt(order.assets[0].id),
        BigInt(order.assets[0].quantity),
      ],
    ],
    order.expiredAt,
    order.paymentToken,
    order.startedAt,
    order.basePrice,
    order.endedAt,
    order.endedPrice,
    order.expectedState || "0",
    order.nonce,
    order.marketFeePercentage,
  ];

  return AbiCoder.defaultAbiCoder().encode(orderTypes, [orderData]);
}

// Re-export isOrderValid from marketplace for backward compatibility
export { isOrderValid } from "./marketplace";

export async function getAxieFloorPrice(
  skyMavisApiKey: string,
): Promise<string | null> {
  const { graphqlUrl, headers } = getMarketplaceApi(skyMavisApiKey);

  try {
    const response = await fetch(graphqlUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({
        query: `query GetAxieLatest($from: Int!, $size: Int!, $sort: SortBy, $auctionType: AuctionType) {
          axies(from: $from, size: $size, sort: $sort, auctionType: $auctionType) {
            total
            results {
              id
              order {
                id
                currentPrice
                expiredAt
                __typename
              }
              __typename
            }
            __typename
          }
        }`,
        variables: {
          from: 0,
          size: 20,
          sort: "PriceAsc",
          auctionType: "Sale",
        },
      }),
    });

    const { data } = await response.json();
    const axies = data?.axies?.results || [];

    // Filter valid axies with active orders (not expired and has current price)
    const validAxies = axies.filter(
      (axie: any) =>
        axie.order &&
        axie.order.currentPrice &&
        BigInt(axie.order.currentPrice) > 0n &&
        axie.order.expiredAt * 1000 > Date.now(),
    );

    if (validAxies.length === 0) {
      return null;
    }

    // Return the cheapest available axie price
    const cheapestAxie = validAxies[0];
    return formatEther(BigInt(cheapestAxie.order.currentPrice));
  } catch (error) {
    return null;
  }
}
