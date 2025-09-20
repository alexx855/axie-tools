import { Signer, parseUnits } from "ethers";
import { apiRequest, getMarketplaceApi } from "../utils";
import {
  getMarketplaceContract,
  getERC1155ExchangeContract,
} from "../contracts";
import { MATERIAL_QUERIES } from "../material";
import type { ICancellationResult, IOrder } from "../marketplace";
import { encodeMaterialOrderData } from "../material";

export default async function cancelMaterialOrder(
  materialId: string,
  signer: Signer,
  skyMavisApiKey: string,
): Promise<ICancellationResult> {
  const userAddress = await signer.getAddress();

  const { graphqlUrl, headers } = getMarketplaceApi(skyMavisApiKey);

  const variables = {
    tokenType: "Material",
    tokenId: materialId,
    owner: userAddress,
    skipId: true,
  };

  const result = await apiRequest<any>(
    graphqlUrl,
    JSON.stringify({
      operationName: "GetErc1155DetailByOwner",
      query: MATERIAL_QUERIES.GET_MATERIAL_BY_OWNER,
      variables,
    }),
    headers,
  );

  // Check response structure
  if (!result.data?.erc1155ByOwner?.orders?.data) {
    return {
      totalOrders: 0,
      canceled: 0,
      failed: 0,
      canceledOrders: [],
      failedCancellations: [],
      message: "No orders found to cancel",
    } as ICancellationResult;
  }

  const userOrders: IOrder[] = result.data.erc1155ByOwner.orders.data;

  const canceledOrders = [];
  const failedCancellations = [];

  // Cancel each order individually
  for (const order of userOrders) {
    try {
      // Use shared encoding function
      const encodedOrderData = encodeMaterialOrderData(order);

      // Create cancel order transaction through marketplace gateway
      const marketGatewayContract = getMarketplaceContract(signer);
      const ERC1155_EXCHANGE_CONTRACT = getERC1155ExchangeContract();
      const cancelOrderPayload =
        ERC1155_EXCHANGE_CONTRACT.interface.encodeFunctionData("cancelOrder", [
          encodedOrderData,
        ]);

      const tx = await marketGatewayContract.interactWith(
        "ERC1155_EXCHANGE",
        cancelOrderPayload,
        {
          gasPrice: parseUnits("26", "gwei"),
          gasLimit: 110000,
        },
      );

      const receipt = await tx.wait();

      canceledOrders.push({
        orderId: order.id,
        transactionHash: receipt.hash,
        quantity: order.assets[0]?.quantity || "0",
        price: order.currentPrice,
      });
    } catch (error: any) {
      failedCancellations.push({
        orderId: order.id,
        error: error.message,
      });
    }
  }

  // Return summary
  const summary: ICancellationResult = {
    totalOrders: userOrders.length,
    canceled: canceledOrders.length,
    failed: failedCancellations.length,
    canceledOrders,
    failedCancellations,
  };

  return summary;
}
