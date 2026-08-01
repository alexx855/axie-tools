import { expect, test } from "bun:test";
import buyMarketplaceOrder from "../lib/marketplace/settle-order";
import { buyMaterialOrder } from "../lib/marketplace/settle-material-order";
import { buyConsumableOrder } from "../lib/marketplace/settle-consumable-order";

const unavailableSigner = null as never;

test("Axie purchases require a positive maximum price before any network call", async () => {
  await expect(
    buyMarketplaceOrder(
      1,
      unavailableSigner,
      "token",
      "api-key",
      undefined as never,
    ),
  ).rejects.toThrow("positive maxPrice");
});

test("Material purchases require a positive maximum total cost before any network call", async () => {
  await expect(
    buyMaterialOrder(
      "1",
      1,
      unavailableSigner,
      "token",
      "api-key",
      undefined as never,
    ),
  ).rejects.toThrow("positive maxTotalCost");
});

test("Consumable purchases require a positive maximum total cost before any network call", async () => {
  await expect(
    buyConsumableOrder(
      "1",
      1,
      unavailableSigner,
      "token",
      "api-key",
      undefined as never,
    ),
  ).rejects.toThrow("positive maxTotalCost");
});
