import { getAxieIdsFromAccount } from "./lib/axie";
import {
  refreshToken,
  getTokenExpirationInfo,
} from "./lib/marketplace/access-token";
import {
  getAxieContract,
  getUSDCContract,
  getWETHContract,
} from "./lib/contracts";
import { batchTransferAxies, transferAxie } from "./lib/transfers";
import {
  approveMarketplaceContract,
  approveWETH,
  approveBatchTransfer,
  approveMaterialMarketplace,
  approveConsumableMarketplace,
} from "./lib/marketplace/approve";
import {
  createProvider,
  askToContinue,
  ensureMarketplaceToken,
  getAccountInfo,
} from "./lib/utils";
import { getAxieFloorPrice } from "./lib/axie";
import { getMaterialFloorPrice, validateMaterialToken } from "./lib/material";
import { getConsumableFloorPrice, validateConsumableToken } from "./lib/consumable";
import cancelMarketplaceOrder from "./lib/marketplace/cancel-order";
import cancelMaterialOrder from "./lib/marketplace/cancel-material-order";
import cancelConsumableOrder from "./lib/marketplace/cancel-consumable-order";
import createMarketplaceOrder from "./lib/marketplace/create-order";
import { createMaterialMarketplaceOrder } from "./lib/marketplace/create-material-order";
import { createConsumableMarketplaceOrder } from "./lib/marketplace/create-consumable-order";
import buyMarketplaceOrder from "./lib/marketplace/settle-order";
import { buyMaterialOrder } from "./lib/marketplace/settle-material-order";
import { buyConsumableOrder } from "./lib/marketplace/settle-consumable-order";

export {
  refreshToken,
  getTokenExpirationInfo,
  getAxieIdsFromAccount,
  approveMarketplaceContract,
  approveWETH,
  approveBatchTransfer,
  approveMaterialMarketplace,
  approveConsumableMarketplace,
  createMarketplaceOrder,
  createMaterialMarketplaceOrder,
  createConsumableMarketplaceOrder,
  cancelMarketplaceOrder,
  cancelMaterialOrder,
  cancelConsumableOrder,
  buyMarketplaceOrder,
  buyMaterialOrder,
  buyConsumableOrder,
  batchTransferAxies,
  transferAxie,
  getAxieContract,
  getUSDCContract,
  getWETHContract,
  createProvider,
  getMaterialFloorPrice,
  getConsumableFloorPrice,
  getAxieFloorPrice,
  askToContinue,
  ensureMarketplaceToken,
  getAccountInfo,
  validateMaterialToken,
  validateConsumableToken,
};
