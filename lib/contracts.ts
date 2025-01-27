import { Interface, Contract, Signer, Provider } from "ethers";
import {
  AXIE_PROXY,
  ERC721_BATCH_TRANSFER,
  MARKETPLACE_GATEWAY_V2,
  USD_COIN,
  WRAPPED_ETHER,
} from "@roninbuilders/contracts";

export function getAxieContract(signerOrProvider?: Signer | Provider) {
  const address = AXIE_PROXY.address;
  const abi = new Interface(AXIE_PROXY.abi);
  return new Contract(address, abi, signerOrProvider);
}

export function getMarketplaceContract(signerOrProvider?: Signer | Provider) {
  const address = MARKETPLACE_GATEWAY_V2.address;
  const abi = new Interface(MARKETPLACE_GATEWAY_V2.abi);
  return new Contract(address, abi, signerOrProvider);
}

export function getBatchTransferContract(signerOrProvider?: Signer | Provider) {
  const address = ERC721_BATCH_TRANSFER.address;
  const abi = new Interface(ERC721_BATCH_TRANSFER.abi);
  return new Contract(address, abi, signerOrProvider);
}

export function getWETHContract(signerOrProvider?: Signer | Provider) {
  const address = WRAPPED_ETHER.address;
  const abi = new Interface(WRAPPED_ETHER.abi);
  return new Contract(address, abi, signerOrProvider);
}

export function getUSDCContract(signerOrProvider?: Signer | Provider) {
  const address = USD_COIN.address;
  // @ts-expect-error wrong USD_COIN.abi
  const abi = new Interface(USD_COIN.abi);
  return new Contract(address, abi, signerOrProvider);
}
