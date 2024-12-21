#!/usr/bin/env node
import { select, input, confirm, password } from '@inquirer/prompts';
import { ethers, utils } from "ethers";
import { getAxieIdsFromAccount } from "./lib/axie";
import { refreshToken } from "./lib/marketplace/access-token";
import { batchTransferAxies, transferAxie } from "./lib/transfers";
import { getAxieContract, getWETHContract } from "./lib/contracts"
import { MARKETPLACE_GATEWAY_V2 } from "@roninbuilders/contracts"
import { askToContinue, ensureMarketplaceToken, getAxieId, } from './lib/utils';
import { approveMarketplaceContract, approveWETH } from './lib/marketplace/approve';
import buyMarketplaceOrder from "./lib/marketplace/settle-order";
import cancelMarketplaceOrder from "./lib/marketplace/cancel-order";
import createMarketplaceOrder from "./lib/marketplace/create-order";
import 'dotenv/config'

async function main() {
  // Ask for Skymavis API key at startup if not in env (optional)
  let skyMavisApiKey = process.env.SKYMAVIS_DAPP_KEY;
  if (!skyMavisApiKey) {
    const shouldProvideKey = await confirm({
      message: '🔑 Would you like to provide a Skymavis DApp API key? (Recommended for better rate limits)',
      default: false
    });

    if (shouldProvideKey) {
      skyMavisApiKey = await input({
        message: '🔑 Enter your Skymavis DApp API key:',
        validate: (value) => value !== undefined && value !== ''
      });
    }
  }

  // Check for PRIVATE_KEY before the main loop
  let privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    privateKey = await password({
      message: '🔐 Enter your private key:',
      validate: (value) => {
        if (!value) return false;
        // Private keys are 32 bytes (64 characters) + optional "0x" prefix
        return utils.isHexString(value, 32) || utils.isHexString(`0x${value}`, 32);
      }
    });
    // Ensure "0x" prefix
    privateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  }

  // Initialize provider with the API key from above
  const provider = new ethers.providers.JsonRpcProvider(
    skyMavisApiKey
      ? `https://api-gateway.skymavis.com/rpc?apikey=${skyMavisApiKey}`
      : "https://api.roninchain.com/rpc"
  );

  // Initialize wallet with the previously obtained private key
  const wallet = new ethers.Wallet(privateKey, provider);
  const address = await wallet.getAddress();

  while (true) {
    try {
      const action = await select({
        message: 'What would you like to do?',
        choices: [
          { name: 'Get account info', value: 'account' },
          { name: 'Refresh access token', value: 'refresh-token' },
          { name: 'Approve WETH', value: 'approve-weth' },
          { name: 'Approve marketplace', value: 'approve-marketplace' },
          { name: 'Buy axie', value: 'buy' },
          { name: 'Delist axie', value: 'delist' },
          { name: 'Delist all axies', value: 'delist-all' },
          { name: 'List axie', value: 'list' },
          { name: 'List all axies', value: 'list-all' },
          { name: 'Transfer axie', value: 'transfer' },
          { name: 'Transfer all axies', value: 'transfer-all' },
        ]
      });

      switch (action) {
        case 'account': {
          const axieIds = await getAxieIdsFromAccount(address, provider);
          console.log(`📬 Address: ${address}`);
          const wethContract = getWETHContract(wallet)

          // Get RON balance
          const balance = await provider.getBalance(address);
          const balanceInEther = utils.formatEther(balance);
          console.log('💰 RON Balance:', balanceInEther);

          // Get WETH balance
          const wethBalance = await wethContract.balanceOf(address);
          const wethBalanceInEther = utils.formatEther(wethBalance);
          console.log('💰 WETH Balance:', wethBalanceInEther);

          // WETH allowance
          const allowance = await wethContract.allowance(address, MARKETPLACE_GATEWAY_V2.address);
          console.log('🛒 Marketplace WETH allowance:', !allowance.eq(0) ? '✅ Granted' : '❌ Not granted')

          // get axie contract
          const axieContract = getAxieContract(provider)

          // check if marketplace is approved for axies
          const isApprovedForAll = await axieContract.isApprovedForAll(address, MARKETPLACE_GATEWAY_V2.address)
          console.log('🔐 Marketplace approval for Axies:', isApprovedForAll ? '✅ Approved' : '❌ Not approved')

          console.log(`🐾 Number of Axies: ${axieIds.length}`);
          if (axieIds.length > 0) {
            console.log(`🆔 Axie IDs: ${axieIds.join(', ')}`);
          }

          break;
        }
        case 'refresh-token': {
          let refreshTokenValue = process.env.MARKETPLACE_REFRESH_TOKEN;

          if (!refreshTokenValue) {
            refreshTokenValue = await input({
              message: 'Enter refresh token',
              validate: (value) => value.length > 0
            });
          }

          const result = await refreshToken(refreshTokenValue);
          console.log('New access token:', result.newAccessToken);
          console.log('New refresh token:', result.newRefreshToken);

          process.env.MARKETPLACE_ACCESS_TOKEN = result.newAccessToken;
          process.env.MARKETPLACE_REFRESH_TOKEN = result.newRefreshToken;

          break;
        }
        case 'approve-weth': {
          await approveWETH(wallet);
          break;
        }
        case 'approve-marketplace': {
          await approveMarketplaceContract(wallet);
          break;
        }
        case 'buy': {
          const token = await ensureMarketplaceToken();
          const axieId = await getAxieId();
          if (!axieId) break;

          const receipt = await buyMarketplaceOrder(
            axieId,
            wallet,
            token,
            process.env.SKYMAVIS_DAPP_KEY // This can be undefined
          );
          if (receipt) {
            console.log('🚀 Transaction successful! Hash:', receipt.transactionHash);
            console.log('🔗 View transaction: https://app.roninchain.com/tx/' + receipt.transactionHash);
          }
          break;
        }
        case 'delist': {
          const axieId = await getAxieId();
          if (!axieId) break;

          const receipt = await cancelMarketplaceOrder(
            axieId,
            wallet,
            process.env.SKYMAVIS_DAPP_KEY // This can be undefined
          );
          if (receipt) {
            console.log('✅ Axie delisted! Transaction hash:', receipt.transactionHash);
            console.log('🔗 View transaction: https://app.roninchain.com/tx/' + receipt.transactionHash);
          }
          break;
        }
        case 'delist-all': {
          const fromAddress = await wallet.getAddress();
          let axieIds = await getAxieIdsFromAccount(fromAddress, provider);

          if (axieIds.length > 100) {
            console.log('⚠️ Warning: Can only transfer up to 100 Axies at once, only delisting the first 100');
            axieIds = axieIds.slice(0, 100);
          }

          const receipt = await batchTransferAxies(wallet, fromAddress, axieIds);
          if (receipt) {
            console.log('✅ Axies delisted! Transaction hash:', receipt.transactionHash);
            console.log('🔗 View transaction: https://app.roninchain.com/tx/' + receipt.transactionHash);
          }else{
            console.log('❌ Error delisting Axies');
          }
          break;
        }
        case 'list': {
          const axieId = await getAxieId();
          if (!axieId) break;

          const token = await ensureMarketplaceToken();
          const basePrice = await input({
            message: 'Enter base price in ETH',
            validate: (value) => utils.parseEther(value).gt(0)
          });
          const address = await wallet.getAddress();
          const currentBlock = await provider.getBlock('latest');
          const startedAt = currentBlock.timestamp;
          const expiredAt = startedAt + 15634800; // ~6 months

          const orderData = {
            address,
            axieId: axieId.toString(),
            basePrice: utils.parseEther(basePrice).toString(),
            endedPrice: '0',
            startedAt,
            endedAt: 0,
            expiredAt,
          };

          const result = await createMarketplaceOrder(
            orderData,
            token,
            wallet,
            process.env.SKYMAVIS_DAPP_KEY // This can be undefined
          );
          if (result === null || result.errors || !result.data) {
            console.error('❌ Error:', result?.errors?.[0]?.message || 'Unknown error');
            break;
          }
          
          console.log(`✅ Listed Axie ${axieId}! Current price in USD: ${result.data.createOrder.currentPriceUsd}`);
          break;
        }
        case 'list-all': {
          const token = await ensureMarketplaceToken();
          const basePrice = await input({
            message: 'Enter base price in ETH (for all Axies)',
            validate: (value) => utils.parseEther(value).gt(0)
          });

          const address = await wallet.getAddress();
          let axieIds = await getAxieIdsFromAccount(address, provider);

          if (axieIds.length > 100) {
            console.log('⚠️ Warning: Can only list up to 100 Axies at once, only listing the first 100');
            axieIds = axieIds.slice(0, 100);
          }

          const currentBlock = await provider.getBlock('latest');
          const startedAt = currentBlock.timestamp;
          const expiredAt = startedAt + 15634800; // ~6 months

          for (const axieId of axieIds) {
            const orderData = {
              address,
              axieId: axieId.toString(),
              basePrice: utils.parseEther(basePrice).toString(),
              endedPrice: '0',
              startedAt,
              endedAt: 0,
              expiredAt,
            };

            const result = await createMarketplaceOrder(
              orderData,
              token,
              wallet,
              process.env.SKYMAVIS_DAPP_KEY
            );

            if (result === null || result.errors || !result.data) {
              console.error(`❌ Error listing Axie ${axieId}:`, result?.errors?.[0]?.message || 'Unknown error');
              continue;
            }

            console.log(`✅ Listed Axie ${axieId}! Current price in USD: ${result.data.createOrder.currentPriceUsd}`);
          }
          break;
        }
        case 'transfer': {
          const axieId = await getAxieId();
          if (!axieId) break;

          const address = await input({
            message: 'Enter recipient address',
            validate: (value) => value.length > 0
          });
          const receipt = await transferAxie(wallet, address, axieId);
          if (receipt) {
            console.log('✅ Axie transferred! Transaction hash:', receipt.transactionHash);
          }
          break;
        }
        case 'transfer-all': {
          const address = await input({
            message: 'Enter recipient address',
            validate: (value) => value.length > 0
          });

          let axieIds = await getAxieIdsFromAccount(address, provider);

          if (axieIds.length > 100) {
            console.log('⚠️ Warning: Can only transfer up to 100 Axies at once, only transfering the first 100');
            axieIds = axieIds.slice(0, 100);
          }

          const receipt = await batchTransferAxies(wallet, address, axieIds);
          if (receipt) {
            console.log('✅ Axies transferred! Transaction hash:', receipt.transactionHash);
          }
          break;
        }

      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('❌ Error:', error.message);
      } else {
        console.error('❌ Error:', error);
      }
    } finally {
      await askToContinue();
    }
  }
}

main();
