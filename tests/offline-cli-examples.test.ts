import { expect, test } from "bun:test";
import { runOffline } from "./helpers/run-offline";
import { readFileSync } from "node:fs";

test.each([false, true])(
  "CLI masks secret prompts and preserves environment bypass (%s)",
  (useEnvironment) => {
    const result = runOffline(`
    import { mock } from "bun:test";
    import * as ethers from "ethers";
    globalThis.fetch = async () => { throw Error("Network forbidden"); };
    process.env.PRIVATE_KEY = "offline-dummy";
    if (${useEnvironment}) {
      process.env.SKYMAVIS_API_KEY = "offline-api";
      process.env.MARKETPLACE_REFRESH_TOKEN = "offline-refresh";
    }
    const prompts = [];
    let actions = 0, refreshes = 0;
    mock.module("dotenv/config", () => ({}));
    mock.module("prompts", () => ({ default: async (question) => {
      prompts.push({name: question.name, type: question.type});
      if (question.name === "apiKey") return {apiKey: "offline-api"};
      if (question.name === "refreshToken") return {refreshToken: "offline-refresh"};
      if (question.name === "action") return {action: actions++ === 0 ? "refresh-token" : undefined};
      throw Error("Unexpected prompt: " + question.name);
    }}));
    mock.module("ethers", () => ({ ...ethers, Wallet: class {
      async getAddress() { return "0x1111111111111111111111111111111111111111"; }
    }}));
    const source = await Bun.file("cli.ts").text();
    const names = source.match(/import \\{([^}]+)\\} from "\\.\\/index"/)[1].split(",").map(s => s.trim()).filter(Boolean);
    const sdk = Object.fromEntries(names.map(name => [name, () => {throw Error("Unexpected SDK call: " + name);} ]));
    sdk.createProvider = () => ({});
    sdk.askToContinue = async () => {};
    sdk.refreshToken = async (value) => {
      if (value !== "offline-refresh") throw Error("Refresh input changed");
      refreshes++;
      return {newAccessToken: "offline-access", newRefreshToken: "offline-next", expirationInfo: {isExpired: false, humanReadable: "offline"}};
    };
    mock.module("./index", () => sdk);
    await import("./cli.ts");
    await new Promise(resolve => setTimeout(resolve, 10));
    console.log("OFFLINE_RESULT:" + JSON.stringify({prompts, refreshes, replacement: process.env.MARKETPLACE_REFRESH_TOKEN}));
  `);
    expect(result.refreshes).toBe(1);
    expect(result.replacement).toBe("offline-next");
    const secrets = result.prompts.filter((p: any) =>
      ["apiKey", "refreshToken"].includes(p.name),
    );
    expect(secrets).toHaveLength(useEnvironment ? 0 : 2);
    for (const prompt of secrets) expect(prompt.type).toBe("password");
  },
);

test("examples install the local SDK that enforces purchase limits", () => {
  const manifest = JSON.parse(
    readFileSync(new URL("../examples/package.json", import.meta.url), "utf8"),
  );
  const lock = JSON.parse(
    readFileSync(
      new URL("../examples/package-lock.json", import.meta.url),
      "utf8",
    ),
  );
  expect(manifest.dependencies["axie-tools"]).toBe("file:..");
  expect(lock.packages["node_modules/axie-tools"]).toMatchObject({
    resolved: "..",
    link: true,
  });
});

test.each([
  ["0.0000001", "100000000000", true],
  ["0.123456789012345678", "123456789012345678", true],
  ["0.123456789012345678", "123456789012345679", false],
  ["0.001", "1000000000000000", true],
])(
  "sniper preserves the exact limit %s at listing price %s",
  (target, price, buys) => {
    const result = runOffline(`
    import { mock } from "bun:test";
    import * as ethers from "ethers";
    process.env.PRIVATE_KEY = "offline-dummy";
    process.env.MARKETPLACE_ACCESS_TOKEN = "offline-token";
    process.env.SKYMAVIS_API_KEY = "offline-api";
    process.argv = ["bun", "floor-sniper.js", ${JSON.stringify(target)}];
    let approvals = 0;
    const purchases = [];
    globalThis.fetch = async (url, options) => {
      if (url !== "https://api-gateway.skymavis.com/graphql/axie-marketplace") throw Error("Unexpected request");
      return new Response(JSON.stringify({data:{axies:{results:[{
        id: "1", order: {currentPrice: ${JSON.stringify(price)}, expiredAt: Math.floor(Date.now()/1000)+3600}
      }]}}}));
    };
    const examples = process.cwd() + "/examples";
    mock.module(Bun.resolveSync("dotenv/config", examples), () => ({}));
    mock.module(Bun.resolveSync("ethers", examples), () => ({...ethers, Wallet: class {}}));
    const sdk = {
      createProvider: () => ({}),
      approveWETH: async () => {approvals++;},
      buyMarketplaceOrder: async (id, wallet, token, key, options) => {
        purchases.push({id, maxPrice: options.maxPrice.toString()}); return false;
      },
    };
    mock.module("axie-tools", () => sdk);
    try { mock.module(Bun.resolveSync("axie-tools", examples), () => sdk); } catch {}
    globalThis.setTimeout = () => {throw Error("OFFLINE_STOP");};
    try { await import("./examples/floor-sniper.js"); }
    catch (error) {if (error.message !== "OFFLINE_STOP") throw error;}
    console.log("OFFLINE_RESULT:" + JSON.stringify({approvals, purchases}));
  `);
    expect(result.approvals).toBe(1);
    expect(result.purchases).toEqual(buys ? [{ id: 1, maxPrice: price }] : []);
  },
);

test.each(["1.0", "1.1", "0.95"])(
  "auto-lister retains tiny positive prices with markup %s",
  (markup) => {
    const result = runOffline(`
    import { mock } from "bun:test";
    import * as ethers from "ethers";
    globalThis.fetch = async () => { throw Error("Network forbidden"); };
    process.env.PRIVATE_KEY = "offline-dummy";
    process.env.MARKETPLACE_ACCESS_TOKEN = "offline-token";
    process.env.SKYMAVIS_API_KEY = "offline-api";
    process.argv = ["bun", "auto-lister.js", ${JSON.stringify(markup)}];
    const listed = [];
    let approvals = 0;
    const examples = process.cwd() + "/examples";
    mock.module(Bun.resolveSync("dotenv/config", examples), () => ({}));
    mock.module(Bun.resolveSync("ethers", examples), () => ({...ethers, Wallet: class {
      async getAddress() {return "0x1111111111111111111111111111111111111111";}
    }}));
    const sdk = {
      getAxieFloorPrice: async () => "0.0000001",
      getAxieIdsFromAccount: async () => [1],
      createProvider: () => ({getBlock: async () => ({timestamp: 1})}),
      approveMarketplaceContract: async () => {approvals++;},
      createMarketplaceOrder: async (order) => {listed.push(order);return {data:{createOrder:{currentPriceUsd:"offline"}}};},
    };
    mock.module("axie-tools", () => sdk);
    // Cover a separately installed example SDK without requiring that install.
    try {
      mock.module(Bun.resolveSync("axie-tools", examples), () => sdk);
    } catch {}
    await import("./examples/auto-lister.js");
    console.log("OFFLINE_RESULT:" + JSON.stringify({listed, approvals}));
  `);
    expect(result.approvals).toBe(1);
    expect(result.listed).toHaveLength(1);
    const expected = {
      "1.0": "100000000000",
      "1.1": "110000000000",
      "0.95": "95000000000",
    };
    expect(result.listed[0].basePrice).toBe(
      expected[markup as keyof typeof expected],
    );
  },
);
