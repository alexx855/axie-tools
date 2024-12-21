import { ethers } from "ethers";
import { getAxieContract } from "./contracts";

export async function getAxieIdsFromAccount(address: string, provider: ethers.providers.JsonRpcProvider) {
  // get axie contract
  const axieContract = getAxieContract(provider)

  // get axies balance for the address
  const axiesBalance = await axieContract.balanceOf(address)

  // get axie ids
  let axieIds: number[] = []
  for (let i = 0; i < axiesBalance; i++) {
    const axieId = await axieContract.tokenOfOwnerByIndex(address, i)
    // convert to number
    if (ethers.BigNumber.isBigNumber(axieId)) {
      axieIds.push(axieId.toNumber())
    }
  }

  return axieIds
}