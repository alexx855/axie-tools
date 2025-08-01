import prompts from "prompts";
import { JsonRpcProvider, formatEther } from "ethers";
import MARKETPLACE_GATEWAY_V2 from "@roninbuilders/contracts/marketplace_gateway_v_2";
import MARKETPLACE_GATEWAY_PROXY from "@roninbuilders/contracts/market_gateway_proxy";
import { getAxieContract, getWETHContract } from "./contracts";
import { getAxieIdsFromAccount } from "./axie";

export function createProvider(skyMavisApiKey: string): JsonRpcProvider {
  return new JsonRpcProvider(
    `https://api-gateway.skymavis.com/rpc?apikey=${skyMavisApiKey}`,
  );
}

export function getMarketplaceApi(skyMavisApiKey: string) {
  const graphqlUrl =
    "https://api-gateway.skymavis.com/graphql/axie-marketplace";

  const headers: Record<string, string> = {
    "x-api-key": skyMavisApiKey,
  };

  return {
    graphqlUrl,
    headers,
  };
}

export async function getAccountInfo(
  address: string,
  provider: JsonRpcProvider,
) {
  const axieIds = await getAxieIdsFromAccount(address, provider);
  const wethContract = getWETHContract(provider);
  const balance = await provider.getBalance(address);
  const wethBalance = await wethContract.balanceOf(address);
  const allowance = await wethContract.allowance(
    address,
    MARKETPLACE_GATEWAY_PROXY.address,
  );
  const axieContract = getAxieContract(provider);
  const isApprovedForAll = await axieContract.isApprovedForAll(
    address,
    MARKETPLACE_GATEWAY_PROXY.address,
  );

  return {
    address,
    ronBalance: formatEther(balance),
    wethBalance: formatEther(wethBalance),
    allowance,
    isApprovedForAll,
    axieIds,
  };
}

export async function apiRequest<T>(
  url: string,
  body: BodyInit | null = null,
  headers: Record<string, string> = {},
  method: "GET" | "POST" = "POST",
) {
  const response = await fetch(url, {
    method,
    headers: {
      ...headers,
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
    },
    ...(method === "GET" ? {} : { body }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const responseText = await response.text();

  try {
    const res: T = JSON.parse(responseText);
    return res;
  } catch (error) {
    throw new Error(`Failed to parse JSON response: ${responseText}`);
  }
}

export const askToContinue = async () => {
  const response = await prompts({
    type: "confirm",
    name: "continue",
    message: "🔄 Would you like to do something else?",
  });
  if (!response.continue) {
    console.log("👋 Goodbye!");
    process.exit(0);
  }
};

export async function ensureMarketplaceToken(): Promise<string> {
  if (!process.env.MARKETPLACE_ACCESS_TOKEN) {
    const response = await prompts({
      type: "password",
      name: "token",
      message: "🔑 Enter your Marketplace access token:",
      validate: (value: string) => value !== undefined && value !== "",
    });
    if (!response.token) {
      console.log("❌ Access token is required");
      process.exit(1);
    }
    process.env.MARKETPLACE_ACCESS_TOKEN = response.token;
  }
  return process.env.MARKETPLACE_ACCESS_TOKEN!;
}

export const getAxieId = async () => {
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
