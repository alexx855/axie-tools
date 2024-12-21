import { ethers, utils } from "ethers";
import { MARKETPLACE_GATEWAY_V2 } from "@roninbuilders/contracts";
import { getAxieContract, getWETHContract } from "../contracts";

// check and approve the axie contract to transfer axies from address to the marketplace contract
export async function approveMarketplaceContract(signer: ethers.Signer) {
  const axieContract = getAxieContract(signer);
  const address = await signer.getAddress();
  let isApproved = await axieContract.isApprovedForAll(address, MARKETPLACE_GATEWAY_V2.address)

  if (!isApproved) {
  const axieContract = getAxieContract(signer);
  console.log(`Approving Marketplace (${MARKETPLACE_GATEWAY_V2.address}) to handle Axies for ${address}`);
  const tx = await axieContract.setApprovalForAll(MARKETPLACE_GATEWAY_V2.address, true, {
    gasPrice: utils.parseUnits('20', 'gwei')
  }); 
  const receipt = await tx.wait();
  console.log('✅ Marketplace approved! Transaction hash:', receipt.transactionHash);
  console.log('🔗 View on Ronin Explorer:', `https://explorer.roninchain.com/tx/${receipt.transactionHash}`);
}
  return isApproved
}

export async function approveWETH(signer: ethers.Signer) {
  const address = await signer.getAddress();
  const wethContract = getWETHContract(signer);
  const currentAllowance = await wethContract.allowance(address, MARKETPLACE_GATEWAY_V2.address);

  if (currentAllowance.isZero()) {
    const amountToApprove = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
    console.log(`Approving Marketplace (${MARKETPLACE_GATEWAY_V2.address}) to spend ${amountToApprove} WETH for the address ${address}`);
    const txApproveWETH = await wethContract.approve(MARKETPLACE_GATEWAY_V2.address, amountToApprove, {
      gasPrice: ethers.utils.parseUnits('20', 'gwei')
    });
    const txApproveReceipt = await txApproveWETH.wait();
    console.log('✅ WETH approved! Transaction hash:', txApproveReceipt.transactionHash);
  }

  return currentAllowance;
}

export async function approveBatchTransfer(
  signer: ethers.Signer,
  batchTransferAddress: string,
): Promise<void> {
  const address = await signer.getAddress()
  const axieContract = getAxieContract(signer)
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
        gasPrice: utils.parseUnits('20', 'gwei')
      }
    );
    await approveTx.wait();
    console.log("✅ Batch transfer contract approved, hash:", approveTx.hash);
  }
}
