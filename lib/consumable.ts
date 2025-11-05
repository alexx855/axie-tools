import { AbiCoder } from "ethers";
import { apiRequest, getMarketplaceApi } from "./utils";
import type { IOrder } from "./marketplace";
import { ORDER_FRAGMENTS } from "./marketplace";

// Consumable-related TypeScript interfaces

export interface ConsumableInfo {
  attributes: any[];
  description: string;
  imageUrl: string;
  name: string;
  tokenAddress: string;
  tokenId: string;
  tokenType: string;
  minPrice?: string;
  totalSupply: string;
  totalOwners: number;
  orders?: {
    totalListed: string;
    totalOrders: number;
  };
}

export interface UserConsumable {
  attributes: any[];
  description: string;
  imageUrl: string;
  name: string;
  tokenAddress: string;
  tokenId: string;
  tokenType: string;
  quantity?: number;
  minPrice?: string;
  orders?: {
    total: number;
  };
}

export interface ICreateConsumableOrderData {
  address: string;
  consumableId: string;
  quantity?: string;
  unitPrice: string;
  endedUnitPrice: string;
  startedAt: number;
  endedAt: number;
  expiredAt: number;
}

// Consumable GraphQL queries

export const CONSUMABLE_QUERIES = {
  GET_CONSUMABLES: `
    query GetConsumables($owner: String, $includeMinPrice: Boolean = false, $includeQuantity: Boolean = false) {
      erc1155Tokens(owner: $owner, tokenType: Consumable, from: 0, size: 32) {
        total
        results {
          ...Erc1155Metadata
          quantity: total @include(if: $includeQuantity)
          minPrice @include(if: $includeMinPrice)
          orders(from: 0, size: 1) {
            total
            __typename
          }
          __typename
        }
        __typename
      }
    }

    fragment Erc1155Metadata on Erc1155Token {
      attributes
      description
      imageUrl
      name
      tokenAddress
      tokenId
      tokenType
      __typename
    }
  `,

  GET_CONSUMABLE_DETAIL: `
    query GetConsumableDetail($tokenId: String) {
      erc1155Token(tokenType: Consumable, tokenId: $tokenId) {
        ...Erc1155Metadata
        minPrice
        totalSupply: total
        totalOwners
        orders(from: 0, size: 1, sort: PriceAsc) {
          totalListed: quantity
          totalOrders: total
          __typename
        }
        __typename
      }
    }

    fragment Erc1155Metadata on Erc1155Token {
      attributes
      description
      imageUrl
      name
      tokenAddress
      tokenId
      tokenType
      __typename
    }
  `,

  GET_CONSUMABLE_ORDERS: `
    query GetBuyNowErc1155Orders($tokenType: Erc1155Type!, $tokenId: String, $from: Int!, $size: Int!, $sort: SortBy = PriceAsc) {
      erc1155Token(tokenType: $tokenType, tokenId: $tokenId) {
        tokenId
        tokenType
        total
        minPrice
        orders(from: $from, size: $size, sort: $sort) {
          total
          quantity
          data {
            ...OrderInfo
            __typename
          }
          __typename
        }
        __typename
      }
    }
    ${ORDER_FRAGMENTS}
  `,

  GET_CONSUMABLE_BY_OWNER: `
    query GetErc1155DetailByOwner($tokenType: Erc1155Type!, $owner: String, $tokenId: String, $skipId: Boolean = false) {
      erc1155ByOwner: erc1155Token(
        tokenType: $tokenType
        owner: $owner
        tokenId: $tokenId
      ) {
        id: tokenId @skip(if: $skipId)
        tokenId
        tokenType
        totalOwned: total
        orders(from: 0, size: 100, maker: $owner, sort: PriceAsc, includeInvalid: true) {
          totalListed: quantity
          totalOrders: total
          data {
            ...OrderInfo
            __typename
          }
          __typename
        }
        __typename
      }
    }
    ${ORDER_FRAGMENTS}
  `,

  GET_CONSUMABLE_OWNERSHIP: `
    query GetErc1155Token($owner: String!, $tokenId: String!) {
      erc1155Token(tokenType: Consumable, tokenId: $tokenId, owner: $owner) {
        tokenId
        tokenType
        total
        orders(from: 0, size: 100, sort: PriceAsc) {
          quantity
          total
          data {
            ...OrderInfo
            __typename
          }
          __typename
        }
        __typename
      }
    }
    ${ORDER_FRAGMENTS}
  `,

  CREATE_ORDER: `
    mutation CreateOrder($order: InputOrder!, $signature: String!) {
      createOrder(order: $order, signature: $signature) {
        ...OrderInfo
        __typename
      }
    }
    ${ORDER_FRAGMENTS}
  `,
};

// Consumable utility functions

export async function checkConsumableOwnership(
  consumableId: string,
  address: string,
  skyMavisApiKey: string,
  accessToken: string,
) {
  const { graphqlUrl, headers } = getMarketplaceApi(skyMavisApiKey);

  const variables = {
    tokenId: consumableId,
    owner: address,
  };

  const apiHeaders: Record<string, string> = {
    ...headers,
    authorization: `Bearer ${accessToken}`,
  };

  try {
    const result = await apiRequest<{ data: { erc1155Token: any } }>(
      graphqlUrl,
      JSON.stringify({
        operationName: "GetErc1155Token",
        query: CONSUMABLE_QUERIES.GET_CONSUMABLE_OWNERSHIP,
        variables,
      }),
      apiHeaders,
    );

    const token = result.data?.erc1155Token;
    console.log(`🔍 Ownership query result:`, JSON.stringify(token, null, 2));

    if (token && token.total === 0) {
      console.log(`ℹ️ User owns 0 of this consumable`);
      return token;
    }

    return token;
  } catch (error) {
    console.log(`❌ Error in checkConsumableOwnership:`, error);
    return null;
  }
}

export async function getUserConsumables(
  address: string,
  skyMavisApiKey: string,
): Promise<UserConsumable[]> {
  const query = CONSUMABLE_QUERIES.GET_CONSUMABLES;
  const variables = {
    owner: address,
    includeMinPrice: false,
    includeQuantity: true,
  };

  const { graphqlUrl, headers } = getMarketplaceApi(skyMavisApiKey);

  try {
    const results = await apiRequest<{
      data: {
        erc1155Tokens: {
          total: number;
          results: UserConsumable[];
        };
      };
    }>(
      graphqlUrl,
      JSON.stringify({ operationName: "GetConsumables", query, variables }),
      headers,
    );

    return results.data?.erc1155Tokens?.results || [];
  } catch (error) {
    return [];
  }
}

export async function validateConsumableToken(
  tokenId: string,
  skyMavisApiKey: string,
): Promise<ConsumableInfo | null> {
  const variables = { tokenId };
  const { graphqlUrl, headers } = getMarketplaceApi(skyMavisApiKey);

  try {
    const result = await apiRequest<any>(
      graphqlUrl,
      JSON.stringify({
        operationName: "GetConsumableDetail",
        query: CONSUMABLE_QUERIES.GET_CONSUMABLE_DETAIL,
        variables,
      }),
      headers,
    );

    if (result?.data?.erc1155Token) {
      return result.data.erc1155Token as ConsumableInfo;
    }
    return null;
  } catch (error) {
    return null;
  }
}

export async function getConsumableFloorPrice(
  consumableId: string,
  skyMavisApiKey: string,
  requestedQuantity?: number,
): Promise<string | null> {
  const { graphqlUrl, headers } = getMarketplaceApi(skyMavisApiKey);

  try {
    const response = await fetch(graphqlUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({
        query: `query GetErc1155Orders($tokenType: Erc1155Type!, $tokenId: String, $sort: SortBy = PriceAsc) {
          erc1155Token(tokenType: $tokenType, tokenId: $tokenId) {
            orders(from: 0, size: 50, sort: $sort) {
              data { currentPrice expiredAt assets { availableQuantity } }
            }
          }
        }`,
        variables: {
          tokenType: "Consumable",
          tokenId: consumableId,
          sort: "PriceAsc",
        },
      }),
    });

    const { data } = await response.json();
    const orders = data?.erc1155Token?.orders?.data || [];

    const validOrders = orders.filter(
      (order: any) =>
        order.expiredAt * 1000 > Date.now() &&
        order.assets?.[0]?.availableQuantity &&
        parseInt(order.assets[0].availableQuantity) > 0,
    );

    if (validOrders.length === 0) {
      return null;
    }

    if (!requestedQuantity || requestedQuantity <= 0) {
      const cheapestOrder = validOrders[0];
      return (Number(cheapestOrder.currentPrice) / 1e18).toFixed(6);
    }

    let remainingQuantity = requestedQuantity;
    let totalCost = 0;
    let ordersUsed = 0;

    for (const order of validOrders) {
      const availableQuantity = parseInt(order.assets[0].availableQuantity);
      const quantityToUse = Math.min(remainingQuantity, availableQuantity);
      const orderPrice = Number(order.currentPrice) / 1e18;

      totalCost += quantityToUse * orderPrice;
      remainingQuantity -= quantityToUse;
      ordersUsed++;

      if (remainingQuantity <= 0) {
        const averagePrice = totalCost / requestedQuantity;
        return averagePrice.toFixed(6);
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

// Consumable-specific utility functions

/**
 * Encode order data for Consumable (ERC1155) orders
 */
export function encodeConsumableOrderData(order: IOrder): string {
  const orderTypes = [
    "(address,uint8,(uint8,address,uint256,uint256),uint256,address,uint256,uint256,uint256,uint256,uint256,uint256)",
  ];

  const orderData = [
    order.maker,
    1, // kind: sell order
    [
      2, // ERC1155 type
      order.assets[0].address,
      parseInt(order.assets[0].id),
      parseInt(order.assets[0].quantity),
    ],
    order.expiredAt,
    order.paymentToken,
    order.startedAt,
    order.basePrice,
    order.endedAt,
    order.endedPrice,
    order.expectedState || 0,
    order.nonce,
  ];

  return AbiCoder.defaultAbiCoder().encode(orderTypes, [orderData]);
}
