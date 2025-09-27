import { AbiCoder, Signer, TransactionReceipt, parseUnits } from "ethers";
import { apiRequest, getMarketplaceApi } from "../utils";
import {
  getMarketplaceContract,
  getWETHContract,
  getERC1155ExchangeContract,
} from "../contracts";
import { MATERIAL_QUERIES } from "../material";

export async function buyMaterialOrder(
  materialId: string,
  quantity: number,
  signer: Signer,
  accessToken: string,
  skyMavisApiKey: string,
): Promise<TransactionReceipt | false> {
  const query = MATERIAL_QUERIES.GET_MATERIAL_ORDERS;

  const variables = {
    tokenType: "Material",
    tokenId: materialId,
    from: 0,
    size: 50,
    sort: "PriceAsc",
  };

  const { graphqlUrl, headers: apiHeaders } = getMarketplaceApi(skyMavisApiKey);
  const headers: Record<string, string> = {
    ...apiHeaders,
    authorization: `Bearer ${accessToken}`,
  };

  try {
    const results = await apiRequest<any>(
      graphqlUrl,
      JSON.stringify({
        operationName: "GetBuyNowErc1155Orders",
        query,
        variables,
      }),
      headers,
    );

    const orders = results.data?.erc1155Token?.orders?.data || [];
    if (!orders || orders.length === 0) {
      return false;
    }

    // Get address first for self-order filtering
    const address = await signer.getAddress();

    // Find valid orders (not expired, has available quantity, and not from same address)
    const validOrders = orders.filter((order: any) => {
      const isExpired = order.expiredAt * 1000 <= Date.now();
      const hasQuantity =
        order.assets?.[0]?.availableQuantity &&
        parseInt(order.assets[0].availableQuantity) > 0;
      const isSelfOrder = order.maker.toLowerCase() === address.toLowerCase();

      return !isExpired && hasQuantity && !isSelfOrder;
    });

    if (validOrders.length === 0) {
      return false;
    }

    // Sort by price (ascending) for best price first, but skip the very cheapest
    // which might be stale or have validation issues
    const sortedValidOrders = validOrders.sort((a: any, b: any) => {
      const priceA = parseFloat(a.currentPrice);
      const priceB = parseFloat(b.currentPrice);
      return priceA - priceB;
    });

    // Skip the first few cheapest orders as they might be stale or have issues
    const ordersToTry = sortedValidOrders.slice(3); // Skip 3 cheapest orders

    // Find the first order with sufficient quantity
    let order: any = null;
    for (const candidateOrder of ordersToTry) {
      const availableQuantity = parseInt(
        candidateOrder.assets[0].availableQuantity,
      );

      if (quantity <= availableQuantity) {
        order = candidateOrder;
        break;
      }
    }

    if (!order) {
      return false;
    }

    // Check WETH balance
    const wethContract = getWETHContract(signer);
    const wethBalance = await wethContract.balanceOf(address);
    const totalCost = BigInt(order.currentPrice) * BigInt(quantity);

    if (BigInt(wethBalance) < totalCost) {
      return false;
    }

    // Check WETH allowance for ERC1155_EXCHANGE contract
    const erc1155ExchangeAddress = "0xb36c9027ed4353fdd7a59d8c40e0df5221a3764f";
    const allowance = await wethContract.allowance(
      address,
      erc1155ExchangeAddress,
    );

    if (BigInt(allowance) < totalCost) {
      const approveTx = await wethContract.approve(
        erc1155ExchangeAddress,
        totalCost,
      );
      await approveTx.wait();
    }

    // Encode order data using flat tuple structure
    const orderTypes = [
      "(address,uint8,uint8,address,uint256,uint256,uint256,address,uint256,uint256,uint256,uint256,uint256,uint256,uint256)",
    ];

    const orderData = [
      [
        order.maker, // address maker
        1, // uint8 kind (sell = 1)
        2, // uint8 erc type (ERC1155 = 2)
        order.assets[0].address, // address asset contract
        BigInt(order.assets[0].id), // uint256 asset id
        BigInt(order.assets[0].quantity), // uint256 original order quantity
        BigInt(order.expiredAt), // uint256 expiredAt
        order.paymentToken, // address paymentToken
        BigInt(order.startedAt), // uint256 startedAt
        BigInt(order.basePrice), // uint256 basePrice
        BigInt(order.endedAt || 0), // uint256 endedAt
        BigInt(order.endedPrice || 0), // uint256 endedPrice
        BigInt(order.expectedState || 0), // uint256 expectedState
        BigInt(order.nonce || 0), // uint256 nonce
        BigInt(order.marketFeePercentage || 425), // uint256 marketFeePercentage
      ],
    ];

    const encodedOrderData = AbiCoder.defaultAbiCoder().encode(
      orderTypes,
      orderData,
    );

    // Create settle info
    const referralAddr = "0xa7d8ca624656922c633732fa2f327f504678d132";
    const parsedExpectedState =
      order.expectedState && order.expectedState !== ""
        ? BigInt(order.expectedState)
        : 0n;

    const settleInfo = {
      orderData: encodedOrderData,
      signature: order.signature,
      referralAddr,
      expectedState: parsedExpectedState,
      recipient: address,
      refunder: address,
    };

    // Use marketplace gateway (direct ERC1155 exchange doesn't allow WETH for some reason)

    try {
      const ERC1155_EXCHANGE_CONTRACT = getERC1155ExchangeContract();

      const settleInfoTuple = [
        settleInfo.orderData,
        settleInfo.signature,
        settleInfo.referralAddr,
        settleInfo.expectedState,
        settleInfo.recipient,
        settleInfo.refunder,
      ];

      // Calculate total settle price: unit price * quantity
      const totalSettlePrice = BigInt(order.currentPrice) * BigInt(quantity);

      const orderExchangeData =
        ERC1155_EXCHANGE_CONTRACT.interface.encodeFunctionData("settleOrder", [
          settleInfoTuple,
          BigInt(quantity),
          totalSettlePrice,
        ]);

      const marketplaceContract = getMarketplaceContract(signer);

      // Estimate gas for gateway call
      const gatewayGasEstimate =
        await marketplaceContract.interactWith.estimateGas(
          "ERC1155_EXCHANGE",
          orderExchangeData,
          {
            gasPrice: parseUnits("26", "gwei"),
          },
        );

      const gatewayTx = await marketplaceContract.interactWith(
        "ERC1155_EXCHANGE",
        orderExchangeData,
        {
          gasPrice: parseUnits("26", "gwei"),
          gasLimit: Math.min(Number(gatewayGasEstimate) + 50000, 600000),
        },
      );

      const gatewayReceipt = await gatewayTx.wait();

      if (gatewayReceipt?.status === 1) {
        return gatewayReceipt;
      } else {
        return false;
      }
    } catch (gatewayError: any) {
      return false;
    }
  } catch (error: any) {
    return false;
  }
}
