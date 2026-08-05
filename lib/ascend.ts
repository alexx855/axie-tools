import { Signer, Contract, parseEther, JsonRpcProvider } from "ethers";
import { getAxieContract } from "./contracts";
import { getGasPrice, type GasPriceOptions } from "./utils";

export interface AscendOptions {
  maxFee?: string;
  gasPriceOptions?: GasPriceOptions;
}

/**
 * Ascend two Axies to breed a higher-level Axie.
 * @param parent1Id The token ID of the first parent Axie.
 * @param parent2Id The token ID of the second parent Axie.
 * @param signer The wallet signing the transaction.
 * @param options Optional ascend configuration.
 */
export async function ascendAxies(
  parent1Id: number | string,
  parent2Id: number | string,
  signer: Signer | Contract,
  options?: AscendOptions,
): Promise<{ hash: string; transactionHash: string }> {
  const axieContract = getAxieContract(signer);
  const maxFee = options?.maxFee ? parseEther(options.maxFee) : parseEther("0.01");

  const gasPrice = await getGasPrice(signer, options?.gasPriceOptions);
  const tx = await axieContract.ascend(parent1Id, parent2Id, maxFee, {
    gasPrice,
    value: maxFee,
  });

  const receipt = await tx.wait();
  return {
    hash: receipt.hash,
    transactionHash: receipt.hash,
  };
}

/**
 * Estimate gas required for ascending two Axies.
 * @param parent1Id The token ID of the first parent Axie.
 * @param parent2Id The token ID of the second parent Axie.
 * @param signer The wallet or provider for estimation.
 * @param options Optional ascend configuration.
 */
export async function estimateAscendGas(
  parent1Id: number | string,
  parent2Id: number | string,
  signer: Signer | Contract | JsonRpcProvider,
  options?: AscendOptions,
): Promise<bigint> {
  const axieContract = getAxieContract(signer);
  const maxFee = options?.maxFee ? parseEther(options.maxFee) : parseEther("0.01");
  return await axieContract.estimateGas.ascend(parent1Id, parent2Id, maxFee, { value: maxFee });
}
