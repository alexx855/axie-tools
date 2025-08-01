import { Interface, Contract, Signer, Provider } from "ethers";
import AXIE_PROXY from "@roninbuilders/contracts/axie_proxy";
import ERC721_BATCH_TRANSFER from "@roninbuilders/contracts/erc_721_batch_transfer";
// import MARKETPLACE_GATEWAY_V2 from '@roninbuilders/contracts/marketplace_gateway_v_2'
import MARKETPLACE_GATEWAY_PROXY from "@roninbuilders/contracts/market_gateway_proxy";
import USD_COIN from "@roninbuilders/contracts/usd_coin";
import WRAPPED_ETHER from "@roninbuilders/contracts/wrapped_ether";

export function getAxieContract(signerOrProvider?: Signer | Provider) {
  const address = AXIE_PROXY.address;
  const abi = new Interface(AXIE_PROXY.proxy_abi);
  return new Contract(address, abi, signerOrProvider);
}

// TODO, use this instead of importing the contract directly everywhere else
export function getMarketplaceContract(signerOrProvider?: Signer | Provider) {
  const address = MARKETPLACE_GATEWAY_PROXY.address;
  const abi = new Interface(MARKETPLACE_GATEWAY_PROXY.proxy_abi);
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
  const abi = new Interface(USD_COIN.abi);
  return new Contract(address, abi, signerOrProvider);
}
