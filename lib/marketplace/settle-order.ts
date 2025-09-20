import { Interface, Signer, TransactionReceipt, parseUnits } from "ethers";
import { getMarketplaceContract, getWETHContract } from "../contracts";
import type { IOrder } from "../marketplace";
import { getAxieDetails, encodeAxieOrderData } from "../axie";

import APP_AXIE_ORDER_EXCHANGE from "@roninbuilders/contracts/app_axie_order_exchange";

export default async function buyMarketplaceOrder(
  axieId: number,
  signer: Signer,
  accessToken: string,
  skyMavisApiKey: string,
  existingOrder?: IOrder,
): Promise<TransactionReceipt | false> {
  try {
    let order: IOrder | null | undefined = existingOrder;

    if (!order) {
      order = await getAxieDetails(axieId, accessToken, skyMavisApiKey);
    }

    if (!order) {
      console.error("No order found for axie", axieId);
      return false;
    }

    const address = await signer.getAddress();

    // Check WETH balance
    const wethContract = getWETHContract(signer);
    const wethBalance = await wethContract.balanceOf(address);

    if (BigInt(wethBalance) < BigInt(order.currentPrice)) {
      console.error("Insufficient WETH balance");
      return false;
    }

    // marketplace order exchange contract
    const contract = getMarketplaceContract(signer);

    // Use shared utility to encode order data
    const encodedOrderData = encodeAxieOrderData(order);

    const referralAddr = "0x0000000000000000000000000000000000000000";

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

    // Call the contract with higher gas price for faster confirmation
    const txBuyAxie = await contract.interactWith(
      "ORDER_EXCHANGE",
      orderExchangeData,
      {
        gasPrice: parseUnits("50", "gwei"),
        gasLimit: 1000000,
      },
    );

    // Wait for the transaction to be mined with timeout (2 minutes)
    const receipt = await txBuyAxie.wait();

    if (receipt?.status === 0) {
      return false;
    }

    return receipt;
  } catch (error) {
    console.error("Error settling order:", error);
    return false;
  }
}
