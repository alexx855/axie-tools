import {
  AbiCoder,
  Contract,
  Interface,
  Signer,
  TransactionReceipt,
  formatEther,
  parseUnits,
} from "ethers";
import { apiRequest } from "../utils";
import {
  APP_AXIE_ORDER_EXCHANGE,
  MARKETPLACE_GATEWAY_V2,
  MARKET_GATEWAY,
  WRAPPED_ETHER,
} from "@roninbuilders/contracts";

interface Axie {
  id: string;
  order: Order;
}

interface Order {
  id: number;
  maker: string;
  kind: string;
  assets: Asset[];
  expiredAt: number;
  paymentToken: string;
  startedAt: number;
  basePrice: string;
  endedAt: number;
  endedPrice: string;
  expectedState: string;
  nonce: number;
  marketFeePercentage: number;
  signature: string;
  hash: string;
  duration: number;
  timeLeft: number;
  currentPrice: string;
  suggestedPrice: string;
  currentPriceUsd: string;
}

interface Asset {
  erc: string;
  address: string;
  id: string;
  quantity: string;
  orderId: number;
}

interface IGetAxieDetail {
  data?: {
    axie: Axie;
  };
  errors?: {
    message: string;
  };
}

// check and approve the axie contract to transfer axies from address to the marketplace contract
export default async function buyMarketplaceOrder(
  axieId: number,
  signer: Signer,
  accessToken: string,
  skyMavisApiKey?: string,
): Promise<TransactionReceipt | false> {
  const query = `query GetAxieDetail($axieId: ID!) {
        axie(axieId: $axieId) {
          ...AxieDetail
          __typename
        }
      }
      fragment AxieDetail on Axie {
        id
        order {
          ...OrderInfo
          __typename
        }
      }

      fragment OrderInfo on Order {
        id
        maker
        kind
        assets {
          ...AssetInfo
          __typename
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
        __typename
      }
      fragment AssetInfo on Asset {
        erc
        address
        id
        quantity
        orderId
        __typename
      }`;

  const variables = {
    axieId,
  };

  const graphqlUrl = skyMavisApiKey
    ? "https://api-gateway.skymavis.com/graphql/axie-marketplace"
    : "https://graphql-gateway.axieinfinity.com/graphql";

  const headers: Record<string, string> = {
    authorization: `Bearer ${accessToken}`,
    ...(skyMavisApiKey && { "x-api-key": skyMavisApiKey }),
  };

  try {
    const results = await apiRequest<IGetAxieDetail>(
      graphqlUrl,
      JSON.stringify({ query, variables }),
      headers,
    );
    const order = results.data?.axie.order;
    if (!order) {
      console.log("No order found");
      return false;
    }

    console.log(
      `Buying axie ${axieId} for ${formatEther(order.currentPrice)} WETH`,
    );

    const address = await signer.getAddress();

    // marketplace order exchange contract
    const marketAbi = new Interface(MARKET_GATEWAY.abi);
    const contract = new Contract(
      MARKETPLACE_GATEWAY_V2.address,
      marketAbi,
      signer,
    );

    // Assuming orderTypes and orderData are defined and orderData is an array
    const orderTypes = [
      "(address maker, uint8 kind, (uint8 erc,address addr,uint256 id,uint256 quantity)[] assets, uint256 expiredAt, address paymentToken, uint256 startedAt, uint256 basePrice, uint256 endedAt, uint256 endedPrice, uint256 expectedState, uint256 nonce, uint256 marketFeePercentage)",
    ];

    const orderData = [
      order.maker,
      1, // market order kind
      [
        [
          // MarketAsset.Asset[]
          1, // MarketAsset.TokenStandard
          order.assets[0].address, // tokenAddress
          order.assets[0].id, // axieId
          +order.assets[0].quantity, // quantity
        ],
      ],
      order.expiredAt,
      WRAPPED_ETHER.address, // paymentToken WETH
      order.startedAt,
      order.basePrice,
      order.endedAt,
      order.endedPrice,
      0, // expectedState
      order.nonce,
      425, // Market fee percentage, 4.25%
    ];

    // Encode the order values
    const encodedOrderData = await AbiCoder.defaultAbiCoder().encode(
      orderTypes,
      [orderData],
    );
    const referralAddr = Buffer.from(
      "MHhhN2Q4Y2E2MjQ2NTY5MjJjNjMzNzMyZmEyZjMyN2Y1MDQ2NzhkMTMy",
      "base64",
    ).toString("utf8");
    const settleInfo = {
      orderData: encodedOrderData,
      signature: order.signature,
      referralAddr,
      expectedState: BigInt(0),
      recipient: address,
      refunder: address,
    };

    const axieOrderExchangeInterface = new Interface(
      APP_AXIE_ORDER_EXCHANGE.abi,
    );
    // Encode the values again
    const orderExchangeData = axieOrderExchangeInterface.encodeFunctionData(
      "settleOrder",
      [settleInfo, BigInt(order.currentPrice)],
    );

    // Call the contract
    const txBuyAxie = await contract.interactWith(
      "ORDER_EXCHANGE",
      orderExchangeData,
      {
        gasPrice: parseUnits("20", "gwei"),
      },
    );

    // Wait for the transaction to be mined
    const receipt = await txBuyAxie.wait();
    return receipt;
  } catch (error) {
    console.log("Error buying axie", error);
  }
  return false;
}
