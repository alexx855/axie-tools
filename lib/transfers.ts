import { Signer } from "ethers";
import { getAxieContract, getBatchTransferContract } from "./contracts";
import { approveBatchTransfer } from "./marketplace/approve";
import { getGasPrice, type GasPriceOptions } from "./utils";

export async function transferAxie(
  signer: Signer,
  addressTo: string,
  axieId: string | number,
  options?: GasPriceOptions,
) {
  const addressFrom = await signer.getAddress();

  const writeAxieContract = getAxieContract(signer);
  const formattedAxieId =
    typeof axieId === "string" ? axieId : axieId.toString();

  const gasPrice = await getGasPrice(signer, options);

  const tx = await writeAxieContract[
    "safeTransferFrom(address,address,uint256)"
  ](
    addressFrom,
    addressTo.replace("ronin:", "0x").toLowerCase(),
    formattedAxieId,
    { gasPrice },
  );

  const receipt = await tx.wait();
  return receipt;
}

export async function batchTransferAxies(
  signer: Signer,
  addressTo: string,
  axieIds: Array<string | number>,
  options?: GasPriceOptions,
) {
  // check if the batch contract is approved to transfer the axies from addressFrom
  const writeBatchTransferContract = getBatchTransferContract(signer);
  const writeAxieContract = getAxieContract(signer);
  const batchTransferAddress = await writeBatchTransferContract.getAddress();
  const axieContractAddress = await writeAxieContract.getAddress();

  await approveBatchTransfer(signer, batchTransferAddress, options);

  const addressFrom = await signer.getAddress();

  // convert axieIds to an array of strings
  const axies: string[] = axieIds.map((axieId) => {
    return typeof axieId === "string" ? axieId : axieId.toString();
  });

  if (axies.length === 0) {
    throw new Error("You must provide at least one axie ID");
  }

  // Ensure proper address format (remove ronin: prefix if present, ensure 0x prefix, lowercase)
  const normalizedAddressTo = addressTo.replace("ronin:", "").toLowerCase();
  const finalAddressTo = normalizedAddressTo.startsWith("0x")
    ? normalizedAddressTo
    : `0x${normalizedAddressTo}`;

  const gasPrice = await getGasPrice(signer, options);

  // batch Transfer, call the function this way since it's overloaded
  const tx = await writeBatchTransferContract[
    "safeBatchTransfer(address,uint256[],address)"
  ](axieContractAddress, axies, finalAddressTo, {
    gasPrice,
  });
  // wait for tx to be mined and get receipt
  const receipt = await tx.wait();
  return receipt;
}
