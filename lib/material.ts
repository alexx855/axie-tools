import { AbiCoder, formatEther } from "ethers";
import { apiRequest, getMarketplaceApi } from "./utils";
import type { IOrder } from "./marketplace";
import { ORDER_FRAGMENTS } from "./marketplace";

// Material-related TypeScript interfaces

export interface MaterialInfo {
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

export interface UserMaterial {
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

export interface ICreateMaterialOrderData {
  address: string;
  materialId: string;
  quantity?: string;
  unitPrice: string;
  endedUnitPrice: string;
  startedAt: number;
  endedAt: number;
  expiredAt: number;
}

// Material GraphQL queries

export const MATERIAL_QUERIES = {
  GET_MATERIALS: `
    query GetMaterials($owner: String, $includeMinPrice: Boolean = false, $includeQuantity: Boolean = false) {
      erc1155Tokens(owner: $owner, tokenType: Material, from: 0, size: 32) {
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

  GET_MATERIAL_DETAIL: `
    query GetMaterialDetail($tokenId: String) {
      erc1155Token(tokenType: Material, tokenId: $tokenId) {
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

  GET_MATERIAL_ORDERS: `
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

  GET_MATERIAL_BY_OWNER: `
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

  GET_MATERIAL_OWNERSHIP: `
    query GetErc1155Token($owner: String!, $tokenId: String!) {
      erc1155Token(tokenType: Material, tokenId: $tokenId, owner: $owner) {
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

// Material utility functions

export async function checkMaterialOwnership(
  materialId: string,
  address: string,
  skyMavisApiKey: string,
  accessToken: string,
) {
  const { graphqlUrl, headers } = getMarketplaceApi(skyMavisApiKey);

  const variables = {
    tokenId: materialId,
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
        query: MATERIAL_QUERIES.GET_MATERIAL_OWNERSHIP,
        variables,
      }),
      apiHeaders,
    );

    const token = result.data?.erc1155Token;
    console.log(`🔍 Ownership query result:`, JSON.stringify(token, null, 2));

    if (token && token.total === 0) {
      console.log(`ℹ️ User owns 0 of this material`);
      return token;
    }

    return token;
  } catch (error) {
    console.log(`❌ Error in checkMaterialOwnership:`, error);
    return null;
  }
}

export async function getUserMaterials(
  address: string,
  skyMavisApiKey: string,
): Promise<UserMaterial[]> {
  const query = MATERIAL_QUERIES.GET_MATERIALS;
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
          results: UserMaterial[];
        };
      };
    }>(
      graphqlUrl,
      JSON.stringify({ operationName: "GetMaterials", query, variables }),
      headers,
    );

    return results.data?.erc1155Tokens?.results || [];
  } catch (error) {
    return [];
  }
}

export async function validateMaterialToken(
  tokenId: string,
  skyMavisApiKey: string,
): Promise<MaterialInfo | null> {
  const variables = { tokenId };
  const { graphqlUrl, headers } = getMarketplaceApi(skyMavisApiKey);

  try {
    const result = await apiRequest<any>(
      graphqlUrl,
      JSON.stringify({
        operationName: "GetMaterialDetail",
        query: MATERIAL_QUERIES.GET_MATERIAL_DETAIL,
        variables,
      }),
      headers,
    );

    if (result?.data?.erc1155Token) {
      return result.data.erc1155Token as MaterialInfo;
    }
    return null;
  } catch (error) {
    return null;
  }
}

export async function getMaterialFloorPrice(
  materialId: string,
  skyMavisApiKey: string,
  requestedQuantity?: number,
): Promise<string | null> {
  const { graphqlUrl, headers } = getMarketplaceApi(skyMavisApiKey);

  try {
    const quantityNeeded = BigInt(requestedQuantity ?? 0);
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
          tokenType: "Material",
          tokenId: materialId,
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
        BigInt(order.assets[0].availableQuantity) > 0n &&
        BigInt(order.currentPrice) > 0n,
    );

    if (validOrders.length === 0) {
      return null;
    }

    if (quantityNeeded <= 0n) {
      const cheapestOrder = validOrders[0];
      return formatEther(BigInt(cheapestOrder.currentPrice));
    }

    let remainingQuantity = quantityNeeded;
    let totalCost = 0n;

    for (const order of validOrders) {
      const availableQuantity = BigInt(order.assets[0].availableQuantity);
      const quantityToUse =
        remainingQuantity < availableQuantity
          ? remainingQuantity
          : availableQuantity;
      const orderPrice = BigInt(order.currentPrice);

      totalCost += quantityToUse * orderPrice;
      remainingQuantity -= quantityToUse;
      if (remainingQuantity <= 0n) {
        // Round up only at the final wei boundary, never to display precision.
        return formatEther((totalCost + quantityNeeded - 1n) / quantityNeeded);
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

// Material-specific utility functions

/**
 * Encode order data for Material (ERC1155) orders
 */
export function encodeMaterialOrderData(order: IOrder): string {
  const orderTypes = [
    "(address,uint8,(uint8,address,uint256,uint256),uint256,address,uint256,uint256,uint256,uint256,uint256,uint256)",
  ];

  const orderData = [
    order.maker,
    1, // kind: sell order
    [
      2, // ERC1155 type
      order.assets[0].address,
      BigInt(order.assets[0].id),
      BigInt(order.assets[0].quantity),
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
