import { getAxieIdsFromAccount } from "./lib/axie";
import { refreshToken } from "./lib/marketplace/access-token";
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
} from "./lib/marketplace/approve";
import {
  createProvider,
  askToContinue,
  ensureMarketplaceToken,
  getAccountInfo,
} from "./lib/utils";
import { getAxieFloorPrice } from "./lib/axie";
import { getMaterialFloorPrice, validateMaterialToken } from "./lib/material";
import cancelMarketplaceOrder from "./lib/marketplace/cancel-order";
import cancelMaterialOrder from "./lib/marketplace/cancel-material-order";
import createMarketplaceOrder from "./lib/marketplace/create-order";
import { createMaterialMarketplaceOrder } from "./lib/marketplace/create-material-order";
import buyMarketplaceOrder from "./lib/marketplace/settle-order";
import { buyMaterialOrder } from "./lib/marketplace/settle-material-order";

export {
  refreshToken,
  getAxieIdsFromAccount,
  approveMarketplaceContract,
  approveWETH,
  approveBatchTransfer,
  approveMaterialMarketplace,
  createMarketplaceOrder,
  createMaterialMarketplaceOrder,
  cancelMarketplaceOrder,
  cancelMaterialOrder,
  buyMarketplaceOrder,
  buyMaterialOrder,
  batchTransferAxies,
  transferAxie,
  getAxieContract,
  getUSDCContract,
  getWETHContract,
  createProvider,
  getMaterialFloorPrice,
  getAxieFloorPrice,
  askToContinue,
  ensureMarketplaceToken,
  getAccountInfo,
  validateMaterialToken,
};
