import { expect, test } from "bun:test";
import { runOfflineProcess } from "./helpers/run-offline";
import { getMaterialContract } from "../lib/contracts";
import MATERIAL from "@roninbuilders/contracts/material_erc_1155_proxy";
import { getAddress } from "ethers";

test("marketplace regressions keep contract mocks in a child process", async () => {
  const result = runOfflineProcess([
    "test",
    "./tests/fixtures/marketplace-regressions.ts",
  ]);
  console.log(result.stderr.toString().split("\n").slice(-5).join("\n"));
  expect(getAddress(await getMaterialContract().getAddress())).toBe(
    getAddress(MATERIAL.address),
  );
});
