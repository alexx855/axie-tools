import { AbiCoder, JsonRpcProvider, isAddress } from "ethers";
import { getAxieContract } from "./contracts";
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
  // get axie contract
  const axieContract = getAxieContract(provider);

  // get axies balance for the address
  const axiesBalance = await axieContract.balanceOf(address);

  // get axie ids
  let axieIds: number[] = [];
  for (let i = 0; i < axiesBalance; i++) {
    try {
      const axieId = await axieContract.tokenOfOwnerByIndex(address, i);
      axieIds.push(Number(axieId));
    } catch (error: unknown) {
      // Skip failed queries
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

/**
 * Encode order data for Axie (ERC721) orders
 */
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
        parseInt(order.assets[0].id),
        parseInt(order.assets[0].quantity),
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
        axie.order.expiredAt * 1000 > Date.now(),
    );

    if (validAxies.length === 0) {
      return null;
    }

    // Return the cheapest available axie price
    const cheapestAxie = validAxies[0];
    return (Number(cheapestAxie.order.currentPrice) / 1e18).toFixed(6);
  } catch (error) {
    return null;
  }
}
