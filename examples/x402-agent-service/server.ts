import { HTTPFacilitatorClient } from "@x402/core/server";
import type { RoutesConfig } from "@x402/core/server";
import type { Network } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import "dotenv/config";
import { isAddress } from "ethers";
import express from "express";
import {
  createProvider,
  getAccountInfo,
  getAxieFloorPrice,
  getMaterialFloorPrice,
  validateMaterialToken,
} from "../../index";

const requiredEnv = ["SKYMAVIS_API_KEY", "X402_PAY_TO"] as const;

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

const port = Number(process.env.PORT ?? 4021);
const skyMavisApiKey = requiredEnvValue("SKYMAVIS_API_KEY");
const payTo = requiredEnvValue("X402_PAY_TO");
const network = (process.env.X402_NETWORK ?? "eip155:84532") as Network;
const facilitatorUrl =
  process.env.X402_FACILITATOR_URL ?? "https://x402.org/facilitator";

const resourceServer = new x402ResourceServer(
  new HTTPFacilitatorClient({ url: facilitatorUrl }),
).register(network, new ExactEvmScheme());

const paidRoutes: RoutesConfig = {
  "GET /paid/axie-floor": {
    accepts: {
      scheme: "exact",
      price: process.env.X402_AXIE_FLOOR_PRICE ?? "$0.01",
      network,
      payTo,
      maxTimeoutSeconds: 120,
    },
    description: "Current Axie marketplace floor price in WETH.",
  },
  "GET /paid/material-floor": {
    accepts: {
      scheme: "exact",
      price: process.env.X402_MATERIAL_FLOOR_PRICE ?? "$0.01",
      network,
      payTo,
      maxTimeoutSeconds: 120,
    },
    description: "Current Material floor price in WETH.",
  },
  "GET /paid/account-info": {
    accepts: {
      scheme: "exact",
      price: process.env.X402_ACCOUNT_INFO_PRICE ?? "$0.02",
      network,
      payTo,
      maxTimeoutSeconds: 120,
    },
    description:
      "Read-only Ronin account balances, approvals, Axies, and Materials.",
  },
};

const app = express();

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "axie-tools-x402-agent-service",
    network,
  });
});

app.use("/paid/material-floor", (req, res, next) => {
  const materialId = firstQueryValue(req.query.materialId);
  const quantityResult = parseOptionalPositiveInteger(req.query.quantity);

  if (!materialId) {
    res.status(400).json({ error: "Missing required query param: materialId" });
    return;
  }

  if (quantityResult.error) {
    res.status(400).json({ error: quantityResult.error });
    return;
  }

  next();
});

app.use("/paid/account-info", (req, res, next) => {
  const address = firstQueryValue(req.query.address);

  if (!address) {
    res.status(400).json({ error: "Missing required query param: address" });
    return;
  }

  if (!isAddress(address)) {
    res.status(400).json({ error: "Invalid Ronin/EVM address" });
    return;
  }

  next();
});

app.use(
  paymentMiddleware(paidRoutes, resourceServer, {
    appName: "Axie Tools Agent API",
    testnet: network !== "eip155:8453",
  }),
);

app.get("/paid/axie-floor", async (_req, res, next) => {
  try {
    const floorPriceWeth = await getAxieFloorPrice(skyMavisApiKey);

    res.json({
      kind: "axie-floor",
      floorPriceWeth,
      source: "axie-marketplace",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/paid/material-floor", async (req, res, next) => {
  try {
    const materialId = firstQueryValue(req.query.materialId);
    const quantityResult = parseOptionalPositiveInteger(req.query.quantity);

    if (!materialId) {
      res
        .status(400)
        .json({ error: "Missing required query param: materialId" });
      return;
    }

    if (quantityResult.error) {
      res.status(400).json({ error: quantityResult.error });
      return;
    }

    const material = await validateMaterialToken(materialId, skyMavisApiKey);
    if (!material) {
      res.status(404).json({ error: "Material token not found", materialId });
      return;
    }

    const floorPriceWeth = await getMaterialFloorPrice(
      materialId,
      skyMavisApiKey,
      quantityResult.value,
    );

    res.json({
      kind: "material-floor",
      materialId,
      quantity: quantityResult.value ?? null,
      material: {
        name: material.name,
        tokenAddress: material.tokenAddress,
        tokenType: material.tokenType,
      },
      floorPriceWeth,
      source: "axie-marketplace",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/paid/account-info", async (req, res, next) => {
  try {
    const address = firstQueryValue(req.query.address);

    if (!address) {
      res.status(400).json({ error: "Missing required query param: address" });
      return;
    }

    if (!isAddress(address)) {
      res.status(400).json({ error: "Invalid Ronin/EVM address" });
      return;
    }

    const provider = createProvider(skyMavisApiKey);
    const account = await getAccountInfo(address, provider, skyMavisApiKey);

    res.json({
      kind: "account-info",
      account: {
        ...account,
        allowance: account.allowance.toString(),
      },
      source: "ronin",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
    });
  },
);

app.listen(port, () => {
  console.log(`Axie Tools x402 agent service listening on :${port}`);
});

function firstQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }

  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function requiredEnvValue(key: (typeof requiredEnv)[number]): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }

  return value;
}

function parseOptionalPositiveInteger(value: unknown): {
  value?: number;
  error?: string;
} {
  const raw = firstQueryValue(value);
  if (!raw) {
    return {};
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { error: "quantity must be a positive integer" };
  }

  return { value: parsed };
}
