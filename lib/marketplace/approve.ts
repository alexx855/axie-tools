import { Signer, parseUnits } from "ethers";
import {
  getAxieContract,
  getWETHContract,
  getMaterialContract,
  getMarketplaceContract,
} from "../contracts";

// check and approve the axie contract to transfer axies from address to the marketplace contract
export async function approveMarketplaceContract(signer: Signer) {
  const axieContract = getAxieContract(signer);
  const marketplaceContract = getMarketplaceContract();
  const address = await signer.getAddress();
  const marketplaceAddress = await marketplaceContract.getAddress();

  let isApproved = await axieContract.isApprovedForAll(
    address,
    marketplaceAddress,
  );

  if (!isApproved) {
    const tx = await axieContract.setApprovalForAll(marketplaceAddress, true, {
      gasPrice: parseUnits("26", "gwei"),
    });
    const receipt = await tx.wait();
  }
  return isApproved;
}

export async function approveWETH(signer: Signer) {
  const address = await signer.getAddress();
  const wethContract = getWETHContract(signer);
  const marketplaceContract = getMarketplaceContract();
  const marketplaceAddress = await marketplaceContract.getAddress();

  const currentAllowance = await wethContract.allowance(
    address,
    marketplaceAddress,
  );

  if (currentAllowance === 0n) {
    const amountToApprove =
      "115792089237316195423570985008687907853269984665640564039457584007913129639935"; // same as app.axie
    const txApproveWETH = await wethContract.approve(
      marketplaceAddress,
      amountToApprove,
      {
        gasPrice: parseUnits("26", "gwei"),
      },
    );
    const txApproveReceipt = await txApproveWETH.wait();
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
    const approveTx = await axieContract.setApprovalForAll(
      batchTransferAddress,
      true,
      {
        gasPrice: parseUnits("26", "gwei"),
      },
    );
    await approveTx.wait();
  }
}

export async function approveMaterialMarketplace(signer: Signer) {
  const materialContract = getMaterialContract(signer);
  const marketplaceContract = getMarketplaceContract();
  const address = await signer.getAddress();
  const marketplaceAddress = await marketplaceContract.getAddress();

  let isApproved = await materialContract.isApprovedForAll(
    address,
    marketplaceAddress,
  );

  if (!isApproved) {
    const tx = await materialContract.setApprovalForAll(
      marketplaceAddress,
      true,
      {
        gasPrice: parseUnits("26", "gwei"),
      },
    );
    const receipt = await tx.wait();
  }
  return isApproved;
}
