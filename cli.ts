#!/usr/bin/env node
import prompts from "prompts";
import { JsonRpcProvider, Wallet, parseEther, isHexString } from "ethers";
import { getAxieIdsFromAccount } from "./lib/axie";
import { refreshToken } from "./lib/marketplace/access-token";
import { batchTransferAxies, transferAxie } from "./lib/transfers";
import {
  askToContinue,
  ensureMarketplaceToken,
  getAccountInfo,
  createProvider,
} from "./lib/utils";
import {
  approveMarketplaceContract,
  approveWETH,
} from "./lib/marketplace/approve";
import buyMarketplaceOrder from "./lib/marketplace/settle-order";
import cancelMarketplaceOrder from "./lib/marketplace/cancel-order";
import createMarketplaceOrder from "./lib/marketplace/create-order";
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
          { title: "Approve marketplace", value: "approve-marketplace" },
          { title: "Settle order (buy axie)", value: "settle" },
          { title: "Cancel order (delist axie)", value: "cancel" },
          {
            title: "Cancel all orders (delist all axies)",
            value: "cancel-all",
          },
          { title: "Create order (list axie)", value: "create" },
          {
            title: "Create orders for all axies (list all)",
            value: "create-all",
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
          const info = await getAccountInfo(address, provider);
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
          console.log(`🐾 Number of Axies: ${info.axieIds.length}`);
          if (info.axieIds.length > 0) {
            console.log(`🆔 Axie IDs: ${info.axieIds.join(", ")}`);
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
        case "create": {
          const axieId = await getAxieId();
          if (!axieId) break;

          const token = await ensureMarketplaceToken();
          const response = await prompts({
            type: "text",
            name: "basePrice",
            message: "Enter base price in ETH",
            validate: (value: string) => parseEther(value) > 0n,
          });
          const basePrice = response.basePrice;
          if (!basePrice) {
            console.log("❌ Base price is required");
            break;
          }

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
        case "create-all": {
          const token = await ensureMarketplaceToken();
          const response = await prompts({
            type: "text",
            name: "basePrice",
            message: "Enter base price in ETH (for all Axies)",
            validate: (value: string) => parseEther(value) > 0n,
          });
          const basePrice = response.basePrice;
          if (!basePrice) {
            console.log("❌ Base price is required");
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
        case "cancel-all": {
          const fromAddress = await wallet.getAddress();
          let axieIds = await getAxieIdsFromAccount(fromAddress, provider);

          if (axieIds.length > 100) {
            console.log(
              "⚠️ Warning: Can only cancel up to 100 orders at once, only cancelling the first 100",
            );
            axieIds = axieIds.slice(0, 100);
          }

          // Cancel orders for each axie individually
          let successCount = 0;
          for (const axieId of axieIds) {
            try {
              const receipt = await cancelMarketplaceOrder(
                axieId,
                wallet,
                skyMavisApiKey,
              );
              if (receipt) {
                console.log(
                  `✅ Cancelled order for Axie ${axieId}! Transaction hash: ${receipt.hash}`,
                );
                successCount++;
              }
            } catch (error) {
              console.log(
                `❌ Error cancelling order for Axie ${axieId}: ${error instanceof Error ? error.message : error}`,
              );
            }
          }
          console.log(
            `✅ Successfully cancelled ${successCount} out of ${axieIds.length} orders`,
          );
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

          let axieIds = await getAxieIdsFromAccount(address, provider);

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
