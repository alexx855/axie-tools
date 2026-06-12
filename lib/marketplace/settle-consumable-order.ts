import { AbiCoder, Signer, TransactionReceipt } from "ethers";
import {
  apiRequest,
  getGasPrice,
  getMarketplaceApi,
  type GasPriceOptions,
} from "../utils";
import {
  getMarketplaceContract,
  getWETHContract,
  getERC1155ExchangeContract,
} from "../contracts";
import { CONSUMABLE_QUERIES } from "../consumable";

export async function buyConsumableOrder(
  consumableId: string,
  quantity: number,
  signer: Signer,
  accessToken: string,
  skyMavisApiKey: string,
  options?: GasPriceOptions,
): Promise<TransactionReceipt | false> {
  const query = CONSUMABLE_QUERIES.GET_CONSUMABLE_ORDERS;

  const { graphqlUrl, headers: apiHeaders } = getMarketplaceApi(skyMavisApiKey);
  const headers: Record<string, string> = {
    ...apiHeaders,
    authorization: `Bearer ${accessToken}`,
  };

  try {
    // Get address first for self-order filtering
    const address = await signer.getAddress();
    const pageSize = 50;
    let from = 0;
    let totalOrders = Number.POSITIVE_INFINITY;
    let order: any = null;

    while (from < totalOrders) {
      const results = await apiRequest<any>(
        graphqlUrl,
        JSON.stringify({
          operationName: "GetBuyNowErc1155Orders",
          query,
          variables: {
            tokenType: "Consumable",
            tokenId: consumableId,
            from,
            size: pageSize,
            sort: "PriceAsc",
          },
        }),
        headers,
      );

      const orders = results.data?.erc1155Token?.orders?.data || [];
      totalOrders =
        results.data?.erc1155Token?.orders?.total ?? from + orders.length;
      if (!orders || orders.length === 0) {
        break;
      }

      // Find valid orders (not expired, has available quantity, and not from same address)
      const validOrders = orders.filter((order: any) => {
        const isExpired = order.expiredAt * 1000 <= Date.now();
        const hasQuantity =
          order.assets?.[0]?.availableQuantity &&
          parseInt(order.assets[0].availableQuantity) > 0;
        const isSelfOrder = order.maker.toLowerCase() === address.toLowerCase();

        return !isExpired && hasQuantity && !isSelfOrder;
      });

      // Sort by price (ascending) for best price first.
      const sortedValidOrders = validOrders.sort((a: any, b: any) => {
        const priceA = parseFloat(a.currentPrice);
        const priceB = parseFloat(b.currentPrice);
        return priceA - priceB;
      });

      // Find the first order with sufficient quantity
      for (const candidateOrder of sortedValidOrders) {
        const availableQuantity = parseInt(
          candidateOrder.assets[0].availableQuantity,
        );

        if (quantity <= availableQuantity) {
          order = candidateOrder;
          break;
        }
      }

      if (order || orders.length < pageSize) {
        break;
      }
      from += orders.length;
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

    const erc1155ExchangeContract = getERC1155ExchangeContract();
    const erc1155ExchangeAddress = await erc1155ExchangeContract.getAddress();
    const allowance = await wethContract.allowance(
      address,
      erc1155ExchangeAddress,
    );
    const gasPrice = await getGasPrice(signer, options);

    if (BigInt(allowance) < totalCost) {
      const approveTx = await wethContract.approve(
        erc1155ExchangeAddress,
        totalCost,
        { gasPrice },
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
      const marketplaceContract = getMarketplaceContract(signer);

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

      // Estimate gas for gateway call
      const gatewayGasEstimate =
        await marketplaceContract.interactWith.estimateGas(
          "ERC1155_EXCHANGE",
          orderExchangeData,
          {
            gasPrice,
          },
        );

      const gatewayTx = await marketplaceContract.interactWith(
        "ERC1155_EXCHANGE",
        orderExchangeData,
        {
          gasPrice,
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
