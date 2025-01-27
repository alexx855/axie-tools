import { JsonRpcProvider } from "ethers";
import { getAxieContract } from "./contracts";

export async function getAxieIdsFromAccount(
  address: string,
  provider: JsonRpcProvider,
) {
  // get axie contract
  const axieContract = getAxieContract(provider);

  // get axies balance for the address
  const axiesBalance = await axieContract.balanceOf(address);

  // get axie ids
  let axieIds: number[] = [];
  for (let i = 0; i < axiesBalance; i++) {
    try {
      const axieId = await axieContract.tokenOfOwnerByIndex(address, i);
      axieIds.push(Number(axieId));
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Error fetching axie id at index ${i}: ${errorMessage}`);
    }
  }

  return axieIds;
}
