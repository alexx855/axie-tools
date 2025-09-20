import prompts from "prompts";
import { JsonRpcProvider, formatEther } from "ethers";
import {
  getAxieContract,
  getWETHContract,
  getMarketplaceContract,
  getMaterialContract,
} from "./contracts";
import { getAxieIdsFromAccount } from "./axie";
import { getUserMaterials } from "./material";

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
  skyMavisApiKey: string,
) {
  const axieIds = await getAxieIdsFromAccount(address, provider);
  const wethContract = getWETHContract(provider);
  const marketplaceContract = getMarketplaceContract(provider);
  const marketplaceAddress = await marketplaceContract.getAddress();

  const balance = await provider.getBalance(address);
  const wethBalance = await wethContract.balanceOf(address);
  const allowance = await wethContract.allowance(address, marketplaceAddress);
  const axieContract = getAxieContract(provider);
  const isApprovedForAll = await axieContract.isApprovedForAll(
    address,
    marketplaceAddress,
  );
  const materialContract = getMaterialContract(provider);
  const isMaterialApprovedForAll = await materialContract.isApprovedForAll(
    address,
    marketplaceAddress,
  );

  // Fetch materials information
  const materials = await getUserMaterials(address, skyMavisApiKey);

  return {
    address,
    ronBalance: formatEther(balance),
    wethBalance: formatEther(wethBalance),
    allowance,
    isApprovedForAll,
    isMaterialApprovedForAll,
    axieIds,
    materials,
  };
}

export async function apiRequest<T>(
  url: string,
  body: BodyInit | null = null,
  headers: Record<string, string> = {},
  method: "GET" | "POST" = "POST",
) {
  // Log GraphQL query and variables if it's a POST request with body
  if (method === "POST" && body) {
    try {
      const parsedBody = JSON.parse(body as string);
      if (parsedBody.query) {
        // console.log("🔍 GraphQL Query:", parsedBody.query.replace(/\s+/g, ' ').trim());
        if (parsedBody.variables) {
          // console.log(
          //   "📋 Variables:",
          //   JSON.stringify(parsedBody.variables, null, 2),
          // );
        }
      }
    } catch (e) {
      console.error("Failed to parse GraphQL request body:", e);
      // If body is not parseable JSON, just continue
    }
  }

  // console.time("🚀 Fetch");
  const response = await fetch(url, {
    method,
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    ...(method === "GET" ? {} : { body }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.timeEnd("🚀 Fetch");
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const responseText = await response.text();
  console.timeEnd("🚀 Fetch");

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
    return null;
  }
  return response.axieId;
};
