import { ethers } from "ethers";
import { getAxieContract, getBatchTransferContract } from "./contracts";
import { approveBatchTransfer } from "./marketplace/approve";

export async function transferAxie(
  signer: ethers.Signer,
  addressTo: string,
  axieId: string | number
) {
  const addressFrom = await signer.getAddress()
  console.log(`Transferring axie ${axieId} from ${addressFrom} to ${addressTo}`)

  const writeAxieContract = getAxieContract(signer)
  const formattedAxieId = typeof axieId === 'string' ? axieId : axieId.toString()

  const tx = await writeAxieContract['safeTransferFrom(address,address,uint256)'](
    addressFrom,
    addressTo.replace('ronin:', '0x').toLowerCase(),
    formattedAxieId,
    { gasPrice: ethers.utils.parseUnits('20', 'gwei') }
  )

  const receipt = await tx.wait()
  return receipt
}

export async function batchTransferAxies(
  signer: ethers.Signer,
  addressTo: string,
  axieIds: Array<string | number>
) {

  // check if the batch contract is approved to transfer the axies from addressFrom
  const writeBatchTransferContract = getBatchTransferContract(signer)
  const writeAxieContract = getAxieContract(signer)

  await approveBatchTransfer(signer, writeBatchTransferContract.address);

  const addressFrom = await signer.getAddress()
  console.log(`Transferring ${axieIds.length} axies from ${addressFrom} to ${addressTo}`)

  // convert axieIds to an array of strings
  const axies: string[] = axieIds.map((axieId) => {
    return typeof axieId === 'string' ? axieId : axieId.toString()
  })

  // batch Transfer, call the function this way since it's overloaded
  const tx = await writeBatchTransferContract.functions['safeBatchTransfer(address,uint256[],address)'](
    writeAxieContract.address,
    axies,
    addressTo.replace('ronin:', '0x').toLowerCase(),
    {
      gasPrice: ethers.utils.parseUnits('20', 'gwei')
    }
  )
  // wait for tx to be mined and get receipt  
  const receipt = await tx.wait()
  return receipt
}