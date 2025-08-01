import {
  AbiCoder,
  Contract,
  Interface,
  Signer,
  TransactionReceipt,
  formatEther,
  parseUnits,
} from "ethers";
import { apiRequest, getMarketplaceApi } from "../utils";
import APP_AXIE_ORDER_EXCHANGE from "@roninbuilders/contracts/app_axie_order_exchange";
import MARKET_GATEWAY from "@roninbuilders/contracts/market_gateway_proxy";
import WRAPPED_ETHER from "@roninbuilders/contracts/wrapped_ether";

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

export default async function buyMarketplaceOrder(
  axieId: number,
  signer: Signer,
  accessToken: string,
  skyMavisApiKey: string,
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
        currentPrice
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

  const { graphqlUrl, headers: apiHeaders } = getMarketplaceApi(skyMavisApiKey);
  const headers: Record<string, string> = {
    ...apiHeaders,
    authorization: `Bearer ${accessToken}`,
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
      `Buying axie ${axieId} for ${formatEther(order.currentPrice)} WETH (current price)`,
    );

    const address = await signer.getAddress();
    console.log("Buyer address:", address);

    // Check WETH balance
    const wethContract = new Contract(
      "0xc99a6a985ed2cac1ef41640596c5a5f9f4e19ef5",
      WRAPPED_ETHER.abi,
      signer,
    );
    const wethBalance = await wethContract.balanceOf(address);
    console.log("WETH Balance:", formatEther(wethBalance), "WETH");
    console.log("Required amount:", formatEther(order.currentPrice), "WETH");

    if (BigInt(wethBalance) < BigInt(order.currentPrice)) {
      console.error("❌ Insufficient WETH balance!");
      console.error(`Need: ${formatEther(order.currentPrice)} WETH`);
      console.error(`Have: ${formatEther(wethBalance)} WETH`);
      return false;
    }

    // marketplace order exchange contract
    const marketAbi = new Interface(MARKET_GATEWAY.proxy_abi);
    const contract = new Contract(MARKET_GATEWAY.address, marketAbi, signer);

    // Assuming orderTypes and orderData are defined and orderData is an array
    const orderTypes = [
      "(address maker, uint8 kind, (uint8 erc,address addr,uint256 id,uint256 quantity)[] assets, uint256 expiredAt, address paymentToken, uint256 startedAt, uint256 basePrice, uint256 endedAt, uint256 endedPrice, uint256 expectedState, uint256 nonce, uint256 marketFeePercentage)",
    ];

    const orderData = [
      order.maker,
      1, // Assuming kind is always 1 for Erc721
      [
        [
          order.assets[0].erc === "Erc721" ? 1 : 0,
          order.assets[0].address,
          +order.assets[0].id,
          +order.assets[0].quantity,
        ],
      ],
      order.expiredAt,
      WRAPPED_ETHER.address, // paymentToken WETH
      order.startedAt,
      order.basePrice,
      order.endedAt,
      order.endedPrice,
      order.expectedState || 0,
      order.nonce,
      order.marketFeePercentage || 425,
    ];

    console.log("Order Data:", orderData);

    // Validate order data
    console.log("Order validation:");
    console.log("- Maker matches order:", orderData[0] === order.maker);
    console.log(
      "- Asset ID matches:",
      (orderData[2] as any[])[0][2] === +order.assets[0].id,
    );
    console.log(
      "- Payment token matches:",
      orderData[4] === order.paymentToken,
    );
    console.log(
      "- Base price in order data:",
      orderData[6] === order.basePrice,
    );
    console.log(
      "- Current price vs base price:",
      order.currentPrice,
      "vs",
      order.basePrice,
    );
    console.log(
      "- Using base price in settlement, current price for payment:",
      BigInt(order.currentPrice),
    );
    console.log("- Expected state:", orderData[9]);
    console.log("- Nonce:", orderData[10]);

    // Encode the order values
    const encodedOrderData = AbiCoder.defaultAbiCoder().encode(orderTypes, [
      orderData,
    ]);
    const referralAddr = Buffer.from(
      "MHhhN2Q4Y2E2MjQ2NTY5MjJjNjMzNzMyZmEyZjMyN2Y1MDQ2NzhkMTMy",
      "base64",
    ).toString("utf8");

    const settleInfo = {
      orderData: encodedOrderData,
      signature: order.signature,
      referralAddr,
      expectedState: BigInt(0),
      recipient: address, // Fixed: buyer should receive the NFT, not the seller
      refunder: address,
    };

    console.log("Settle Info:");
    console.log("- NFT recipient (buyer):", address);
    console.log("- NFT seller:", order.maker);
    console.log("- Refunder:", address);
    console.log("- Expected state:", settleInfo.expectedState);

    const axieOrderExchangeInterface = new Interface(
      APP_AXIE_ORDER_EXCHANGE.abi,
    );
    // Encode the values again
    const orderExchangeData = axieOrderExchangeInterface.encodeFunctionData(
      "settleOrder",
      [settleInfo, BigInt(order.currentPrice)],
    );

    // Double-check order is still available right before purchase
    console.log("🔄 Re-checking order availability before purchase...");
    const recheckResults = await apiRequest<IGetAxieDetail>(
      graphqlUrl,
      JSON.stringify({ query, variables }),
      headers,
    );
    const currentOrder = recheckResults.data?.axie.order;
    if (!currentOrder) {
      console.error(
        "❌ Order no longer available! Another buyer likely purchased it.",
      );
      return false;
    }
    if (currentOrder.currentPrice !== order.currentPrice) {
      console.warn(
        `⚠️  Price changed from ${formatEther(order.currentPrice)} to ${formatEther(currentOrder.currentPrice)} WETH`,
      );
    }

    // Call the contract with higher gas price for faster confirmation
    console.log("Sending transaction...");
    const txBuyAxie = await contract.interactWith(
      "ORDER_EXCHANGE",
      orderExchangeData,
      {
        gasPrice: parseUnits("50", "gwei"),
        gasLimit: 1000000,
      },
    );

    console.log("Transaction sent, hash:", txBuyAxie.hash);
    console.log(
      "🔗 View on Ronin Explorer:",
      `https://app.roninchain.com/tx/${txBuyAxie.hash}`,
    );
    console.log("Waiting for transaction to be mined...");

    // Wait for the transaction to be mined with timeout (2 minutes)
    const receipt = await Promise.race([
      txBuyAxie.wait(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Transaction timeout after 120 seconds")),
          120000,
        ),
      ),
    ]);

    console.log("Transaction mined!");
    console.log("- Status:", receipt?.status);
    console.log("- Gas used:", receipt?.gasUsed?.toString());
    console.log("- Gas limit:", receipt?.gasLimit?.toString());
    console.log("- Effective gas price:", receipt?.gasPrice?.toString());
    console.log("- Block number:", receipt?.blockNumber);

    if (receipt?.status === 0) {
      console.error("❌ Transaction failed (status: 0)");
      console.error("This means the transaction was mined but reverted");
    } else if (receipt?.status === 1) {
      console.log("✅ Transaction successful!");
    }

    return receipt;
  } catch (error) {
    console.log("Error buying axie", error);
  }
  return false;
}
