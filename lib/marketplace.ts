// Marketplace-related TypeScript interfaces and GraphQL fragments

export interface IAsset {
  erc: string;
  address: string;
  id: string;
  quantity: string;
  orderId?: string;
  availableQuantity?: string;
  remainingQuantity?: string;
}

export interface IOrder {
  id: string;
  maker: string;
  kind: string;
  expiredAt: number;
  paymentToken: string;
  startedAt: number;
  basePrice: string;
  endedAt: number;
  endedPrice: string;
  expectedState: string | number;
  nonce: string | number;
  marketFeePercentage: string | number;
  signature: string;
  hash?: string;
  duration?: number;
  timeLeft?: number;
  currentPrice: string;
  suggestedPrice?: string;
  currentPriceUsd?: string;
  status?: string;
  assets: IAsset[];
  makerProfile?: {
    name?: string;
    addresses?: {
      ronin?: string;
    };
  };
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

export interface IOperationResult {
  success: boolean;
  data?: any;
  error?: string;
  transactionHash?: string;
}

export interface ICancellationResult {
  totalOrders: number;
  canceled: number;
  failed: number;
  canceledOrders: Array<{
    orderId: string;
    transactionHash: string;
    quantity: string;
    price: string;
  }>;
  failedCancellations: Array<{
    orderId: string;
    error: string;
  }>;
  message?: string;
}

// Marketplace GraphQL fragments

export const ORDER_FRAGMENTS = `
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
      ...AssetInfo
      availableQuantity
      remainingQuantity
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
    status
    __typename
  }

  fragment AssetInfo on Asset {
    erc
    address
    id
    quantity
    orderId
    __typename
  }
`;

// Utility functions

/**
 * Check if an order is still valid (not expired and has available quantity)
 */
export function isOrderValid(order: IOrder): boolean {
  const now = Math.floor(Date.now() / 1000);
  const hasAvailableQuantity = Boolean(
    order.assets?.[0]?.availableQuantity &&
      parseInt(order.assets[0].availableQuantity) > 0,
  );
  const notExpired = order.expiredAt > now;

  return notExpired && hasAvailableQuantity;
}
