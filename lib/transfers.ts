import { Signer, parseUnits } from "ethers";
import { getAxieContract, getBatchTransferContract } from "./contracts";
import { approveBatchTransfer } from "./marketplace/approve";

export async function transferAxie(
  signer: Signer,
  addressTo: string,
  axieId: string | number,
) {
  const addressFrom = await signer.getAddress();
  console.log(
    `Transferring axie ${axieId} from ${addressFrom} to ${addressTo}`,
  );

  const writeAxieContract = getAxieContract(signer);
  const formattedAxieId =
    typeof axieId === "string" ? axieId : axieId.toString();

  const tx = await writeAxieContract[
    "safeTransferFrom(address,address,uint256)"
  ](
    addressFrom,
    addressTo.replace("ronin:", "0x").toLowerCase(),
    formattedAxieId,
    { gasPrice: parseUnits("25", "gwei") },
  );

  const receipt = await tx.wait();
  return receipt;
}

export async function batchTransferAxies(
  signer: Signer,
  addressTo: string,
  axieIds: Array<string | number>,
) {
  // check if the batch contract is approved to transfer the axies from addressFrom
  const writeBatchTransferContract = getBatchTransferContract(signer);
  const writeAxieContract = getAxieContract(signer);
  const batchTransferAddress = await writeBatchTransferContract.getAddress();
  const axieContractAddress = await writeAxieContract.getAddress();

  await approveBatchTransfer(signer, batchTransferAddress);

  const addressFrom = await signer.getAddress();
  console.log(
    `Transferring ${axieIds.length} axies from ${addressFrom} to ${addressTo}`,
  );

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

  console.log(
    `Using addresses: from=${addressFrom}, to=${finalAddressTo}, contract=${axieContractAddress}`,
  );
  console.log(`Axie IDs: ${axies.join(", ")}`);

  // batch Transfer, call the function this way since it's overloaded
  const tx = await writeBatchTransferContract[
    "safeBatchTransfer(address,uint256[],address)"
  ](axieContractAddress, axies, finalAddressTo, {
    gasPrice: parseUnits("25", "gwei"),
  });
  // wait for tx to be mined and get receipt
  const receipt = await tx.wait();
  return receipt;
}
