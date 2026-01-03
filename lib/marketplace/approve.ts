import { Signer } from "ethers";
import {
  getAxieContract,
  getWETHContract,
  getMaterialContract,
  getMarketplaceContract,
} from "../contracts";
import { getGasPrice, type GasPriceOptions } from "../utils";

// check and approve the axie contract to transfer axies from address to the marketplace contract
export async function approveMarketplaceContract(
  signer: Signer,
  options?: GasPriceOptions,
) {
  const axieContract = getAxieContract(signer);
  const marketplaceContract = getMarketplaceContract();
  const address = await signer.getAddress();
  const marketplaceAddress = await marketplaceContract.getAddress();

  let isApproved = await axieContract.isApprovedForAll(
    address,
    marketplaceAddress,
  );

  if (!isApproved) {
    const gasPrice = await getGasPrice(signer, options);
    const tx = await axieContract.setApprovalForAll(marketplaceAddress, true, {
      gasPrice,
    });
    const receipt = await tx.wait();
  }
  return isApproved;
}

export async function approveWETH(signer: Signer, options?: GasPriceOptions) {
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
    const gasPrice = await getGasPrice(signer, options);
    const txApproveWETH = await wethContract.approve(
      marketplaceAddress,
      amountToApprove,
      {
        gasPrice,
      },
    );
    const txApproveReceipt = await txApproveWETH.wait();
  }

  return currentAllowance;
}

export async function approveBatchTransfer(
  signer: Signer,
  batchTransferAddress: string,
  options?: GasPriceOptions,
): Promise<void> {
  const address = await signer.getAddress();
  const axieContract = getAxieContract(signer);
  const isApproved = await axieContract.isApprovedForAll(
    address,
    batchTransferAddress,
  );
  if (!isApproved) {
    const gasPrice = await getGasPrice(signer, options);
    const approveTx = await axieContract.setApprovalForAll(
      batchTransferAddress,
      true,
      {
        gasPrice,
      },
    );
    await approveTx.wait();
  }
}

export async function approveMaterialMarketplace(
  signer: Signer,
  options?: GasPriceOptions,
) {
  const materialContract = getMaterialContract(signer);
  const marketplaceContract = getMarketplaceContract();
  const address = await signer.getAddress();
  const marketplaceAddress = await marketplaceContract.getAddress();

  let isApproved = await materialContract.isApprovedForAll(
    address,
    marketplaceAddress,
  );

  if (!isApproved) {
    const gasPrice = await getGasPrice(signer, options);
    const tx = await materialContract.setApprovalForAll(
      marketplaceAddress,
      true,
      {
        gasPrice,
      },
    );
    const receipt = await tx.wait();
  }
  return isApproved;
}
