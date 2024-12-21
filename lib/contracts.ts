import { ethers, utils } from "ethers";
import { AXIE_PROXY, ERC721_BATCH_TRANSFER, MARKETPLACE_GATEWAY_V2, USD_COIN, WRAPPED_ETHER } from "@roninbuilders/contracts";

export function getAxieContract(signerOrProvider?: ethers.Signer | ethers.providers.Provider) {
  const address = AXIE_PROXY.address
  const abi = new utils.Interface(AXIE_PROXY.abi);
  const axieContract = new ethers.Contract(
    address,
    abi,
    signerOrProvider
  )
  return axieContract
}

export function getMarketplaceContract(signerOrProvider?: ethers.Signer | ethers.providers.Provider) {
  const address =  MARKETPLACE_GATEWAY_V2.address
  const abi = new utils.Interface(MARKETPLACE_GATEWAY_V2.abi);
  const marketplaceContract = new ethers.Contract(
    address,
    abi,
    signerOrProvider
  )
  return marketplaceContract
}

export function getBatchTransferContract(signerOrProvider?: ethers.Signer | ethers.providers.Provider) {
  const address =  ERC721_BATCH_TRANSFER.address
  const abi = new utils.Interface(ERC721_BATCH_TRANSFER.abi);
  const batchTransferContract = new ethers.Contract(
    address,
    abi,
    signerOrProvider
  )
  return batchTransferContract
}

export function getWETHContract(signerOrProvider?: ethers.Signer | ethers.providers.Provider) {
  const address = WRAPPED_ETHER.address
  const abi = new utils.Interface(WRAPPED_ETHER.abi);
  const wethContract = new ethers.Contract(
    address,
    abi,
    signerOrProvider
  )
  return wethContract
}

export function getUSDCContract(signerOrProvider?: ethers.Signer | ethers.providers.Provider) {
  const address =  USD_COIN.address
  // @ts-expect-error wrong USD_COIN.abi??
  const abi = new utils.Interface(USD_COIN.abi);
  const usdcContract = new ethers.Contract(
    address,
    abi,
    signerOrProvider
  )
  return usdcContract
}
