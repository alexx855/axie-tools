#!/usr/bin/env node
import prompts from "prompts";
import { Wallet, parseEther, isHexString } from "ethers";
import {
  getAxieIdsFromAccount,
  refreshToken,
  batchTransferAxies,
  transferAxie,
  askToContinue,
  ensureMarketplaceToken,
  getAccountInfo,
  createProvider,
  validateMaterialToken,
  getMaterialFloorPrice,
  getAxieFloorPrice,
  approveMarketplaceContract,
  approveMaterialMarketplace,
  approveWETH,
  buyMarketplaceOrder,
  buyMaterialOrder,
  cancelMarketplaceOrder,
  cancelMaterialOrder,
  createMarketplaceOrder,
  createMaterialMarketplaceOrder,
} from "./index";
import "dotenv/config";

const getAxieId = async () => {
  const response = await prompts({
    type: "number",
    name: "axieId",
    message: "🆔 Enter Axie ID:",
    validate: (value: number) => value !== undefined && !isNaN(value),
  });
  if (response.axieId === undefined) {
    console.log("❌ Invalid Axie ID!");
    return null;
  }
  return response.axieId;
};

const getMaterialId = async (skyMavisApiKey: string) => {
  const response = await prompts({
    type: "text",
    name: "materialId",
    message: "🆔 Enter Material ID:",
    validate: (value: string) => value !== undefined && value.length > 0,
  });
  if (response.materialId === undefined) {
    console.log("❌ Invalid Material ID!");
    return null;
  }

  console.log("🔍 Validating material token...");
  const materialInfo = await validateMaterialToken(
    response.materialId,
    skyMavisApiKey,
  );

  if (!materialInfo) {
    console.log("❌ Material ID not found or invalid!");
    return null;
  }

  console.log(`✅ Found material: ${materialInfo.name}`);
  console.log(`📄 Description: ${materialInfo.description}`);
  console.log(`📦 Total Supply: ${materialInfo.totalSupply}`);
  console.log(`👥 Total Owners: ${materialInfo.totalOwners}`);
  if (materialInfo.minPrice) {
    console.log(
      `💰 Min Price: ${(Number(materialInfo.minPrice) / 1e18).toFixed(6)} WETH`,
    );
  }
  if (materialInfo.orders) {
    console.log(`🛒 Listed Quantity: ${materialInfo.orders.totalListed}`);
    console.log(`📋 Total Orders: ${materialInfo.orders.totalOrders}`);
  }

  return response.materialId;
};

const getQuantity = async (optional = false) => {
  const message = optional
    ? "📦 Enter Quantity (leave empty to use all available):"
    : "📦 Enter Quantity:";

  const response = await prompts({
    type: "number",
    name: "quantity",
    message,
    validate: (value: number) => optional || (!isNaN(value) && value > 0),
  });

  if (!optional && !response.quantity) {
    console.log("❌ Invalid Quantity!");
    return null;
  }

  return response.quantity || null;
};

const getPrice = async (
  optional = false,
  materialId?: string,
  skyMavisApiKey?: string,
  quantity?: number,
  isAxie = false,
  customMessage?: string,
) => {
  let message: string;
  if (customMessage) {
    message = customMessage;
  } else {
    message = optional
      ? "💰 Enter Price (in WETH, leave empty to use floor price):"
      : "💰 Enter Price (in WETH):";
  }

  const response = await prompts({
    type: "text",
    name: "price",
    message,
    validate: (value: string) =>
      optional ? true : value && value.length > 0 && !isNaN(parseFloat(value)),
  });

  if (!optional && !response.price) {
    console.log("❌ Invalid Price!");
    return null;
  }

  if (optional && !response.price?.trim() && skyMavisApiKey) {
    console.log("🔍 Getting floor price from marketplace...");
    let floorPrice: string | null = null;

    if (isAxie) {
      floorPrice = await getAxieFloorPrice(skyMavisApiKey);
    } else if (materialId) {
      floorPrice = await getMaterialFloorPrice(
        materialId,
        skyMavisApiKey,
        quantity,
      );
    }

    if (!floorPrice) {
      console.log(
        "❌ Could not determine floor price. Please enter a price manually.",
      );
      return null;
    }
    console.log(`💰 Using floor price: ${floorPrice} WETH`);
    return floorPrice;
  }

  return response.price || null;
};

async function main() {
  // Require Skymavis API key
  let skyMavisApiKey = process.env.SKYMAVIS_API_KEY;
  if (!skyMavisApiKey) {
    const response = await prompts({
      type: "text",
      name: "apiKey",
      message:
        "🔑 Enter your Skymavis project API key (get from https://developers.roninchain.com/console/applications/):",
      validate: (value: string) => value !== undefined && value !== "",
    });
    skyMavisApiKey = response.apiKey;
    if (!skyMavisApiKey) {
      console.log("❌ API key is required");
      process.exit(1);
    }
  }

  // Check for PRIVATE_KEY before the main loop
  let privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    const response = await prompts({
      type: "password",
      name: "privateKey",
      message: "🔐 Enter your private key:",
      validate: (value: string) => {
        if (!value) return false;
        // Private keys are 32 bytes (64 characters) + optional "0x" prefix
        return isHexString(value, 32) || isHexString(`0x${value}`, 32);
      },
    });
    privateKey = response.privateKey;
    if (!privateKey) {
      console.log("❌ Private key is required");
      process.exit(1);
    }
    // Ensure "0x" prefix
    privateKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  }

  // Initialize provider with the required API key
  const provider = createProvider(skyMavisApiKey);

  // Initialize wallet with the previously obtained private key
  const wallet = new Wallet(privateKey, provider);
  const address = await wallet.getAddress();

  while (true) {
    try {
      const response = await prompts({
        type: "select",
        name: "action",
        message: "What would you like to do?",
        choices: [
          { title: "Get account info", value: "account" },
          { title: "Refresh access token", value: "refresh-token" },
          { title: "Approve WETH", value: "approve-weth" },
          { title: "Approve Axie marketplace", value: "approve-marketplace" },
          {
            title: "Approve Material marketplace",
            value: "approve-material-marketplace",
          },
          { title: "Settle axie order (buy axie)", value: "settle" },
          {
            title: "Settle material order (buy material)",
            value: "settle-material",
          },
          { title: "Cancel axie order (delist axie)", value: "cancel" },
          {
            title: "Cancel material order (delist materials)",
            value: "cancel-material",
          },
          {
            title: "Cancel all axie orders (delist all axies)",
            value: "cancel-all",
          },
          { title: "Create axie order (list axie)", value: "create" },
          {
            title: "Create material order (list material)",
            value: "create-material",
          },
          {
            title: "Create axie auction (list axie for auction)",
            value: "create-auction",
          },
          {
            title: "Create orders for all axies (list all)",
            value: "create-all",
          },
          {
            title: "Create auction orders for all axies (list all as auctions)",
            value: "create-auction-all",
          },
          { title: "Transfer axie", value: "transfer" },
          { title: "Transfer all axies", value: "transfer-all" },
        ],
      });
      const action = response.action;
      if (!action) {
        console.log("❌ Action selection cancelled");
        break;
      }

      switch (action) {
        case "account": {
          const info = await getAccountInfo(address, provider, skyMavisApiKey);
          console.log(`📬 Address: ${info.address}`);
          console.log("💰 RON Balance:", info.ronBalance);
          console.log("💰 WETH Balance:", info.wethBalance);
          console.log(
            "🛒 Marketplace WETH allowance:",
            info.allowance !== 0n ? "✅ Granted" : "❌ Not granted",
          );
          console.log(
            "🔐 Marketplace approval for Axies:",
            info.isApprovedForAll ? "✅ Approved" : "❌ Not approved",
          );
          console.log(
            "🔐 Marketplace approval for Materials:",
            info.isMaterialApprovedForAll ? "✅ Approved" : "❌ Not approved",
          );
          console.log(`🐾 Number of Axies: ${info.axieIds.length}`);
          if (info.axieIds.length > 0) {
            console.log(`🆔 Axie IDs: ${info.axieIds.join(", ")}`);
          }
          console.log(`🧪 Number of Materials: ${info.materials.length}`);
          if (info.materials.length > 0) {
            console.log("📋 Materials:");
            info.materials.forEach((material) => {
              console.log(
                `   • ${material.name} (ID: ${material.tokenId})${material.quantity ? ` - Qty: ${material.quantity}` : ""}${material.orders?.total ? ` - Listed: ${material.orders.total}` : ""}`,
              );
            });
          }
          break;
        }
        case "refresh-token": {
          let refreshTokenValue = process.env.MARKETPLACE_REFRESH_TOKEN;

          if (!refreshTokenValue) {
            const response = await prompts({
              type: "text",
              name: "refreshToken",
              message: "Enter refresh token",
              validate: (value: string) => value.length > 0,
            });
            refreshTokenValue = response.refreshToken;
            if (!refreshTokenValue) {
              console.log("❌ Refresh token is required");
              break;
            }
          }

          const result = await refreshToken(refreshTokenValue);
          console.log("New access token:", result.newAccessToken);
          console.log("New refresh token:", result.newRefreshToken);

          process.env.MARKETPLACE_ACCESS_TOKEN = result.newAccessToken;
          process.env.MARKETPLACE_REFRESH_TOKEN = result.newRefreshToken;

          break;
        }
        case "approve-weth": {
          await approveWETH(wallet);
          break;
        }
        case "approve-marketplace": {
          await approveMarketplaceContract(wallet);
          break;
        }
        case "approve-material-marketplace": {
          await approveMaterialMarketplace(wallet);
          break;
        }
        case "settle": {
          const token = await ensureMarketplaceToken();
          const axieId = await getAxieId();
          if (!axieId) break;
          await approveWETH(wallet);
          const receipt = await buyMarketplaceOrder(
            axieId,
            wallet,
            token,
            skyMavisApiKey,
          );
          if (receipt) {
            console.log("🚀 Transaction successful! Hash:", receipt.hash);
            console.log(
              "🔗 View transaction: https://app.roninchain.com/tx/" +
                receipt.hash,
            );
          }
          break;
        }
        case "settle-material": {
          const token = await ensureMarketplaceToken();
          const materialId = await getMaterialId(skyMavisApiKey);
          if (!materialId) break;
          const quantity = await getQuantity();
          if (!quantity) break;
          await approveWETH(wallet);
          const receipt = await buyMaterialOrder(
            materialId,
            quantity,
            wallet,
            token,
            skyMavisApiKey,
          );
          if (receipt) {
            console.log("🚀 Transaction successful! Hash:", receipt.hash);
            console.log(
              "🔗 View transaction: https://app.roninchain.com/tx/" +
                receipt.hash,
            );
          }
          break;
        }
        case "create": {
          const axieId = await getAxieId();
          if (!axieId) break;

          const token = await ensureMarketplaceToken();
          const basePrice = await getPrice(
            true,
            undefined,
            skyMavisApiKey,
            undefined,
            true,
          );
          if (!basePrice) break;

          await approveMarketplaceContract(wallet);

          const currentBlock = await provider.getBlock("latest");
          const startedAt = currentBlock!.timestamp;
          const expiredAt = startedAt + 15634800; // ~6 months

          const orderData = {
            address,
            axieId: axieId.toString(),
            basePrice: parseEther(basePrice).toString(),
            endedPrice: "0",
            startedAt,
            endedAt: 0,
            expiredAt,
          };

          const result = await createMarketplaceOrder(
            orderData,
            token,
            wallet,
            skyMavisApiKey,
          );
          if (result === null || result.errors || !result.data) {
            console.error(
              "❌ Error:",
              result?.errors?.[0]?.message || "Unknown error",
            );
            break;
          }

          console.log(
            `✅ Created order for Axie ${axieId}! Current price in USD: ${result.data.createOrder.currentPriceUsd}`,
          );
          break;
        }
        case "create-material": {
          const materialId = await getMaterialId(skyMavisApiKey);
          if (!materialId) break;
          const quantity = await getQuantity(true); // Optional quantity
          const price = await getPrice(
            true,
            materialId,
            skyMavisApiKey,
            quantity,
          ); // Optional price with floor price fallback
          if (!price) break;

          const token = await ensureMarketplaceToken();
          await approveMaterialMarketplace(wallet);

          const currentBlock = await provider.getBlock("latest");
          const startedAt = currentBlock!.timestamp;
          const expiredAt = startedAt + 15634800; // ~6 months

          const orderData = {
            address,
            materialId: materialId.toString(),
            quantity: quantity ? quantity.toString() : undefined,
            unitPrice: parseEther(price).toString(),
            endedUnitPrice: "0",
            startedAt,
            endedAt: 0,
            expiredAt,
          };

          const result = await createMaterialMarketplaceOrder(
            orderData,
            token,
            wallet,
            skyMavisApiKey,
          );
          if (result === null || result.errors || !result.data) {
            console.error(
              "❌ Error:",
              result?.errors?.[0]?.message || "Unknown error",
            );
            break;
          }

          console.log(
            `✅ Created material order for Material ${materialId}${quantity ? ` (qty: ${quantity})` : " (all available)"}! Current price in USD: ${result.data.createOrder.currentPriceUsd}`,
          );
          break;
        }
        case "create-auction": {
          const axieId = await getAxieId();
          if (!axieId) break;

          const token = await ensureMarketplaceToken();

          // Starting price is required - cannot use floor price for auctions
          const startPrice = await getPrice(
            false, // required, not optional
            undefined,
            skyMavisApiKey,
            undefined,
            true,
            "💰 Enter starting price (in WETH):",
          );
          if (!startPrice) break;

          // Ending price can use floor price
          const endPrice = await getPrice(
            true,
            undefined,
            skyMavisApiKey,
            undefined,
            true,
            "🏁 Enter ending price (in WETH, leave empty to use floor price):",
          );
          if (!endPrice) break;

          const durationResponse = await prompts({
            type: "number",
            name: "duration",
            message: "Enter auction duration in hours (1-168)",
            validate: (value: number) => value >= 1 && value <= 168,
          });
          const durationHours = durationResponse.duration;
          if (!durationHours) {
            console.log("❌ Duration is required");
            break;
          }

          await approveMarketplaceContract(wallet);

          const currentBlock = await provider.getBlock("latest");
          const startedAt = currentBlock!.timestamp;
          const endedAt = startedAt + durationHours * 3600; // convert hours to seconds
          const expiredAt = startedAt + 15634800; // ~6 months

          const orderData = {
            address,
            axieId: axieId.toString(),
            basePrice: parseEther(startPrice).toString(),
            endedPrice: parseEther(endPrice).toString(),
            startedAt,
            endedAt,
            expiredAt,
          };

          const result = await createMarketplaceOrder(
            orderData,
            token,
            wallet,
            skyMavisApiKey,
          );
          if (result === null || result.errors || !result.data) {
            console.error(
              "❌ Error:",
              result?.errors?.[0]?.message || "Unknown error",
            );
            break;
          }

          console.log(`✅ Created auction for Axie ${axieId}!`);
          console.log(`Start price: ${startPrice} ETH`);
          console.log(`End price: ${endPrice} ETH`);
          console.log(`Duration: ${durationHours} hours`);
          console.log(
            `Current price in USD: ${result.data.createOrder.currentPriceUsd}`,
          );
          break;
        }
        case "create-all": {
          const token = await ensureMarketplaceToken();
          const basePrice = await getPrice(
            true,
            undefined,
            skyMavisApiKey,
            undefined,
            true,
          );
          if (!basePrice) break;

          await approveMarketplaceContract(wallet);

          let axieIds = await getAxieIdsFromAccount(address, provider);

          if (axieIds.length > 100) {
            console.log(
              "⚠️ Warning: Can only list up to 100 Axies at once, only listing the first 100",
            );
            axieIds = axieIds.slice(0, 100);
          }

          const currentBlock = await provider.getBlock("latest");
          const startedAt = currentBlock!.timestamp;
          const expiredAt = startedAt + 15634800; // ~6 months

          for (const axieId of axieIds) {
            const orderData = {
              address,
              axieId: axieId.toString(),
              basePrice: parseEther(basePrice).toString(),
              endedPrice: "0",
              startedAt,
              endedAt: 0,
              expiredAt,
            };

            const result = await createMarketplaceOrder(
              orderData,
              token,
              wallet,
              skyMavisApiKey,
            );

            if (result === null || result.errors || !result.data) {
              console.error(
                `❌ Error creating order for Axie ${axieId}:`,
                result?.errors?.[0]?.message || "Unknown error",
              );
              continue;
            }

            console.log(
              `✅ Created order for Axie ${axieId}! Current price in USD: ${result.data.createOrder.currentPriceUsd}`,
            );
          }
          break;
        }
        case "create-auction-all": {
          const token = await ensureMarketplaceToken();

          // Starting price is required - cannot use floor price for auctions
          const startPrice = await getPrice(
            false, // required, not optional
            undefined,
            skyMavisApiKey,
            undefined,
            true,
            "💰 Enter starting price for all auctions (in WETH):",
          );
          if (!startPrice) break;

          // Ending price can use floor price
          const endPrice = await getPrice(
            true,
            undefined,
            skyMavisApiKey,
            undefined,
            true,
            "🏁 Enter ending price for all auctions (in WETH, leave empty to use floor price):",
          );
          if (!endPrice) break;

          const durationResponse = await prompts({
            type: "number",
            name: "duration",
            message:
              "Enter auction duration in hours for all auctions (1-168):",
            validate: (value: number) => value >= 1 && value <= 168,
          });
          const durationHours = durationResponse.duration;
          if (!durationHours) {
            console.log("❌ Duration is required");
            break;
          }

          await approveMarketplaceContract(wallet);

          let axieIds = await getAxieIdsFromAccount(address, provider);

          if (axieIds.length > 100) {
            console.log(
              "⚠️ Warning: Can only list up to 100 Axies at once, only listing the first 100",
            );
            axieIds = axieIds.slice(0, 100);
          }

          const currentBlock = await provider.getBlock("latest");
          const startedAt = currentBlock!.timestamp;
          const endedAt = startedAt + durationHours * 3600; // convert hours to seconds
          const expiredAt = startedAt + 15634800; // ~6 months

          console.log(`🚀 Creating auctions for ${axieIds.length} Axies...`);
          console.log(`Start price: ${startPrice} WETH`);
          console.log(`End price: ${endPrice} WETH`);
          console.log(`Duration: ${durationHours} hours`);

          let successCount = 0;
          let errorCount = 0;

          for (const axieId of axieIds) {
            const orderData = {
              address,
              axieId: axieId.toString(),
              basePrice: parseEther(startPrice).toString(),
              endedPrice: parseEther(endPrice).toString(),
              startedAt,
              endedAt,
              expiredAt,
            };

            const result = await createMarketplaceOrder(
              orderData,
              token,
              wallet,
              skyMavisApiKey,
            );

            if (result === null || result.errors || !result.data) {
              console.error(
                `❌ Error creating auction for Axie ${axieId}:`,
                result?.errors?.[0]?.message || "Unknown error",
              );
              errorCount++;
              continue;
            }

            console.log(
              `✅ Created auction for Axie ${axieId}! Current price in USD: ${result.data.createOrder.currentPriceUsd}`,
            );
            successCount++;
          }

          console.log(
            `🏁 Summary: ${successCount} auctions created successfully, ${errorCount} errors`,
          );
          break;
        }
        case "cancel": {
          const axieId = await getAxieId();
          if (!axieId) break;

          const receipt = await cancelMarketplaceOrder(
            axieId,
            wallet,
            skyMavisApiKey,
          );
          if (receipt) {
            console.log("✅ Order cancelled! Transaction hash:", receipt.hash);
            console.log(
              "🔗 View transaction: https://app.roninchain.com/tx/" +
                receipt.hash,
            );
          }
          break;
        }
        case "cancel-material": {
          const materialId = await getMaterialId(skyMavisApiKey);
          if (!materialId) break;

          const result = await cancelMaterialOrder(
            materialId,
            wallet,
            skyMavisApiKey,
          );
          if (result && "canceled" in result && result.canceled > 0) {
            console.log(
              `✅ Successfully cancelled ${result.canceled} material order(s)!`,
            );
            if (result.canceledOrders.length > 0) {
              result.canceledOrders.forEach((order) => {
                console.log(
                  "🔗 View transaction: https://app.roninchain.com/tx/" +
                    order.transactionHash,
                );
              });
            }
          } else if (result && "message" in result) {
            console.log("❌", result.message);
          }
          break;
        }
        case "cancel-all": {
          const fromAddress = await wallet.getAddress();
          let axieIds = await getAxieIdsFromAccount(fromAddress, provider);

          if (axieIds.length === 0) {
            console.log("❌ No Axies found in your account");
            break;
          }

          if (axieIds.length > 100) {
            console.log(
              "⚠️ Warning: Can only cancel up to 100 orders at once, only cancelling the first 100",
            );
            axieIds = axieIds.slice(0, 100);
          }

          console.log(
            `📦 Cancelling orders for ${axieIds.length} Axies using batch transfer...`,
          );

          try {
            // Transfer all axies to the same address (self-transfer) to delist them all at once
            const receipt = await batchTransferAxies(
              wallet,
              fromAddress,
              axieIds,
            );
            if (receipt) {
              console.log(
                `✅ Successfully cancelled all orders for ${axieIds.length} Axies in one transaction!`,
              );
              console.log("🚀 Transaction hash:", receipt.hash);
              console.log(
                "🔗 View transaction: https://app.roninchain.com/tx/" +
                  receipt.hash,
              );
            }
          } catch (error) {
            console.log(
              `❌ Error cancelling orders: ${error instanceof Error ? error.message : error}`,
            );
          }
          break;
        }

        case "transfer": {
          const axieId = await getAxieId();
          if (!axieId) break;

          const response = await prompts({
            type: "text",
            name: "address",
            message: "Enter recipient address",
            validate: (value: string) => value.length > 0,
          });
          const address = response.address;
          if (!address) {
            console.log("❌ Recipient address is required");
            break;
          }
          const receipt = await transferAxie(wallet, address, axieId);
          if (receipt) {
            console.log("✅ Axie transferred! Transaction hash:", receipt.hash);
            console.log(
              "🔗 View transaction: https://app.roninchain.com/tx/" +
                receipt.hash,
            );
          }
          break;
        }
        case "transfer-all": {
          const response = await prompts({
            type: "text",
            name: "address",
            message: "Enter recipient address",
            validate: (value: string) => value.length > 0,
          });
          const address = response.address;
          if (!address) {
            console.log("❌ Recipient address is required");
            break;
          }

          const fromAddress = await wallet.getAddress();
          let axieIds = await getAxieIdsFromAccount(fromAddress, provider);

          if (axieIds.length > 100) {
            console.log(
              "⚠️ Warning: Can only transfer up to 100 Axies at once, only transfering the first 100",
            );
            axieIds = axieIds.slice(0, 100);
          }

          const receipt = await batchTransferAxies(wallet, address, axieIds);
          if (receipt) {
            console.log(
              "✅ Axies transferred! Transaction hash:",
              receipt.hash,
            );
            console.log(
              "🔗 View transaction: https://app.roninchain.com/tx/" +
                receipt.hash,
            );
          }
          break;
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error("❌ Error:", error.message);
      } else {
        console.error("❌ Error:", error);
      }
    } finally {
      await askToContinue();
    }
  }
}

main();
