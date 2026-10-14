import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../", import.meta.url));

// Isolate mocks from other tests and disable both credential loading and installs.
function runOffline(script: string) {
  const result = Bun.spawnSync({
    cmd: [process.execPath, "--no-env-file", "--no-install", "-e", script],
    cwd: repo,
    env: { PATH: process.env.PATH ?? "" },
    stdout: "pipe",
    stderr: "pipe",
    timeout: 10000,
  });
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.toString() + result.stdout.toString());
  }
  const line = result.stdout
    .toString()
    .split("\n")
    .find((line) => line.startsWith("OFFLINE_RESULT:"));
  if (!line) throw new Error("Offline child did not complete");
  return JSON.parse(line.slice("OFFLINE_RESULT:".length));
}

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
