import { parseUnits, Signer } from "ethers";
import MARKETPLACE_GATEWAY_PROXY from "@roninbuilders/contracts/market_gateway_proxy";
import { getAxieContract, getWETHContract } from "../contracts";

// check and approve the axie contract to transfer axies from address to the marketplace contract
export async function approveMarketplaceContract(signer: Signer) {
  const axieContract = getAxieContract(signer);
  const address = await signer.getAddress();
  let isApproved = await axieContract.isApprovedForAll(
    address,
    MARKETPLACE_GATEWAY_PROXY.address,
  );

  if (!isApproved) {
    const axieContract = getAxieContract(signer);
    console.log(
      `Approving Marketplace (${MARKETPLACE_GATEWAY_PROXY.address}) to handle Axies for ${address}`,
    );
    const tx = await axieContract.setApprovalForAll(
      MARKETPLACE_GATEWAY_PROXY.address,
      true,
      {
        gasPrice: parseUnits("21", "gwei"),
      },
    );
    const receipt = await tx.wait();
    console.log("✅ Marketplace approved! Transaction hash:", receipt.hash);
    console.log(
      "🔗 View on Ronin Explorer:",
      `https://app.roninchain.com/tx/${receipt.hash}`,
    );
  }
  return isApproved;
}

export async function approveWETH(signer: Signer) {
  const address = await signer.getAddress();
  const wethContract = getWETHContract(signer);
  const currentAllowance = await wethContract.allowance(
    address,
    MARKETPLACE_GATEWAY_PROXY.address,
  );

  if (currentAllowance === 0n) {
    const amountToApprove =
      "115792089237316195423570985008687907853269984665640564039457584007913129639935";
    console.log("Amount to approve:", amountToApprove);
    console.log(
      "Marketplace Gateway Proxy Address:",
      MARKETPLACE_GATEWAY_PROXY.address,
    );
    console.log(
      `Approving Marketplace (${MARKETPLACE_GATEWAY_PROXY.address}) to spend ${amountToApprove} WETH for the address ${address}`,
    );
    const txApproveWETH = await wethContract.approve(
      MARKETPLACE_GATEWAY_PROXY.address,
      amountToApprove,
      {
        gasPrice: parseUnits("21", "gwei"),
      },
    );
    const txApproveReceipt = await txApproveWETH.wait();
    console.log("✅ WETH approved! Transaction hash:", txApproveReceipt.hash);
  }

  return currentAllowance;
}

export async function approveBatchTransfer(
  signer: Signer,
  batchTransferAddress: string,
): Promise<void> {
  const address = await signer.getAddress();
  const axieContract = getAxieContract(signer);
  const isApproved = await axieContract.isApprovedForAll(
    address,
    batchTransferAddress,
  );
  if (!isApproved) {
    console.info("🛠️ Approving batch transfer contract...");
    const approveTx = await axieContract.setApprovalForAll(
      batchTransferAddress,
      true,
      {
        gasPrice: parseUnits("21", "gwei"),
      },
    );
    await approveTx.wait();
    console.log("✅ Batch transfer contract approved, hash:", approveTx.hash);
  }
}
