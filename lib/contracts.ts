import { Interface, Contract, Signer, Provider } from "ethers";
import AXIE_PROXY from "@roninbuilders/contracts/axie_proxy";
import ERC721_BATCH_TRANSFER from "@roninbuilders/contracts/erc_721_batch_transfer";
import MARKETPLACE_GATEWAY_PROXY from "@roninbuilders/contracts/market_gateway_proxy";
import MATERIAL_ERC_1155_PROXY from "@roninbuilders/contracts/material_erc_1155_proxy";
import ERC_1155_EXCHANGE from "@roninbuilders/contracts/erc_1155_exchange_21a3764f";
import USD_COIN from "@roninbuilders/contracts/usd_coin";
import WRAPPED_ETHER from "@roninbuilders/contracts/wrapped_ether";

export function getAxieContract(signerOrProvider?: Signer | Provider) {
  const address = AXIE_PROXY.address;
  const abi = new Interface(AXIE_PROXY.proxy_abi);
  return new Contract(address, abi, signerOrProvider);
}

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
  const abi = new Interface(USD_COIN.proxy_abi);
  return new Contract(address, abi, signerOrProvider);
}

export function getMaterialContract(signerOrProvider?: Signer | Provider) {
  const address = MATERIAL_ERC_1155_PROXY.address;
  const abi = new Interface(MATERIAL_ERC_1155_PROXY.proxy_abi);
  return new Contract(address, abi, signerOrProvider);
}

export function getERC1155ExchangeContract(
  signerOrProvider?: Signer | Provider,
) {
  const address = ERC_1155_EXCHANGE.address;
  const abi = new Interface(ERC_1155_EXCHANGE.abi);
  return new Contract(address, abi, signerOrProvider);
}
