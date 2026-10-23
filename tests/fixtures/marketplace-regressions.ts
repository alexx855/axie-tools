import { afterAll, beforeEach, expect, mock, test } from "bun:test";
import {
  AbiCoder,
  Interface,
  getAddress,
  parseEther,
  TypedDataEncoder,
} from "ethers";
import APP_AXIE_ORDER_EXCHANGE from "@roninbuilders/contracts/app_axie_order_exchange";
import type { IOrder } from "../../lib/marketplace";
import type { TransactionReceipt } from "ethers";

const BUYER = "0x1111111111111111111111111111111111111111";
const SELLER = "0x2222222222222222222222222222222222222222";
const AXIE = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const MATERIAL = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const WETH = "0xcccccccccccccccccccccccccccccccccccccccc";
const GATEWAY = "0xdddddddddddddddddddddddddddddddddddddddd";
const expiry = Math.floor(Date.now() / 1000) + 3600;
const receipt = {
  status: 1,
  hash: "offline-receipt",
} as unknown as TransactionReceipt;
const axieInterface = new Interface(APP_AXIE_ORDER_EXCHANGE.abi);
const exchangeInterface = new Interface([
  "function settleOrder((bytes orderData,bytes signature,address referralAddr,uint256 expectedState,address recipient,address refunder),uint256,uint256)",
]);
const axieTuple =
  "(address,uint8,(uint8,address,uint256,uint256)[],uint256,address,uint256,uint256,uint256,uint256,uint256,uint256,uint256)";
const erc1155Tuple =
  "(address,uint8,(uint8,address,uint256,uint256),uint256,address,uint256,uint256,uint256,uint256,uint256,uint256)";

let orders: IOrder[];
let fetchedOrder: IOrder;
let floorOrders: IOrder[];
let requests: any[];
let writes: { kind: string; data: string }[];
let signed: { domain: any; types: any; value: any }[];
let balanceReads: number;
let beforeBalance: (() => void) | undefined;
let makerNonceReads: number;
const originalFetch = globalThis.fetch;

function order(price = "10", id = "1"): IOrder {
  return {
    id,
    maker: SELLER,
    kind: "Sell",
    expiredAt: expiry,
    paymentToken: WETH,
    startedAt: 1,
    basePrice: price,
    currentPrice: price,
    endedAt: 0,
    endedPrice: "0",
    expectedState: "0",
    nonce: "0",
    marketFeePercentage: "425",
    signature: "0x",
    assets: [
      {
        erc: "Erc721",
        address: AXIE,
        id,
        quantity: "0",
        availableQuantity: "10",
      },
    ],
  };
}

const interactWith = Object.assign(
  async (kind: string, data: string) => {
    writes.push({ kind, data });
    return { wait: async () => receipt };
  },
  { estimateGas: async () => 100000n },
);

mock.module("../../lib/contracts", () => ({
  getAxieContract: () => ({ getAddress: async () => AXIE }),
  getMaterialContract: () => ({ getAddress: async () => MATERIAL }),
  getConsumableContract: () => ({ getAddress: async () => MATERIAL }),
  getWETHContract: () => ({
    getAddress: async () => WETH,
    balanceOf: async () => {
      balanceReads++;
      beforeBalance?.();
      return 10n ** 30n;
    },
    allowance: async () => 10n ** 30n,
    approve: () => {
      throw new Error("Unexpected approval in offline test");
    },
  }),
  getMarketplaceContract: () => ({
    getAddress: async () => GATEWAY,
    makerNonce: async () => {
      makerNonceReads++;
      return 7n;
    },
    interactWith,
  }),
  getERC1155ExchangeContract: () => ({
    getAddress: async () => MATERIAL,
    interface: exchangeInterface,
  }),
  getMulticall3Contract: () => ({}),
  getUSDCContract: () => ({}),
  getBatchTransferContract: () => ({}),
}));

const { default: buyMarketplaceOrder } = await import(
  "../../lib/marketplace/settle-order"
);
const { default: cancelMarketplaceOrder } = await import(
  "../../lib/marketplace/cancel-order"
);
const { buyMaterialOrder } = await import(
  "../../lib/marketplace/settle-material-order"
);
const { createMaterialMarketplaceOrder } = await import(
  "../../lib/marketplace/create-material-order"
);
const { createConsumableMarketplaceOrder } = await import(
  "../../lib/marketplace/create-consumable-order"
);
const { default: createMarketplaceOrder } = await import(
  "../../lib/marketplace/create-order"
);
const { getAxieFloorPrice } = await import("../../lib/axie");
const { getMaterialFloorPrice, encodeMaterialOrderData } = await import(
  "../../lib/material"
);
const { getConsumableFloorPrice, encodeConsumableOrderData } = await import(
  "../../lib/consumable"
);
const signer = {
  getAddress: async () => BUYER,
  connect() {
    return this;
  },
  async signTypedData(domain: any, types: any, value: any) {
    signed.push({ domain, types, value: structuredClone(value) });
    return "0x";
  },
} as any;

beforeEach(() => {
  orders = [];
  fetchedOrder = order();
  floorOrders = [order("100000000000")];
  requests = [];
  writes = [];
  signed = [];
  balanceReads = 0;
  makerNonceReads = 0;
  beforeBalance = undefined;
  globalThis.fetch = mock(async (_url: any, options: any) => {
    const request = JSON.parse(options?.body || "{}");
    requests.push(request);
    let payload: unknown;
    if (request.operationName === "GetErc1155Token") {
      payload = { data: { erc1155Token: { total: 10 } } };
    } else if (request.operationName === "CreateOrder") {
      payload = { data: { createOrder: { hash: "offline-order" } } };
    } else if (request.operationName === "GetBuyNowErc1155Orders") {
      payload = {
        data: {
          erc1155Token: { orders: { data: orders, total: orders.length } },
        },
      };
    } else if (request.query?.includes("GetAxieDetail")) {
      payload = { data: { axie: { id: "1", order: fetchedOrder } } };
    } else if (request.query?.includes("GetAxieLatest")) {
      payload = {
        data: {
          axies: {
            results: floorOrders.map((o) => ({ id: o.assets[0].id, order: o })),
          },
        },
      };
    } else if (request.query?.includes("GetErc1155Orders")) {
      payload = {
        data: {
          erc1155Token: {
            orders: { data: floorOrders, total: floorOrders.length },
          },
        },
      };
    } else {
      throw new Error("Unmocked request blocked: " + request.operationName);
    }
    return new Response(JSON.stringify(payload));
  }) as unknown as typeof fetch;
});
afterAll(() => {
  globalThis.fetch = originalFetch;
});

test.each([1, 2, 3, 4])(
  "material buyer considers the cheapest of %i valid orders",
  async (count) => {
    orders = Array.from({ length: count }, (_, i) =>
      order(String((i + 1) * 10)),
    );
    const result = await buyMaterialOrder("1", 1, signer, "dummy", "dummy", {
      maxTotalCost: 15n,
      gasPrice: 1n,
    });
    expect(result).toEqual(receipt);
    expect(writes).toHaveLength(1);
    expect(
      exchangeInterface.decodeFunctionData("settleOrder", writes[0].data)[2],
    ).toBe(10n);
  },
);

test("material selection compares wei beyond Number precision", async () => {
  orders = [order("9007199254740993"), order("9007199254740992")];
  expect(
    await buyMaterialOrder("1", 1, signer, "dummy", "dummy", {
      maxTotalCost: 9007199254740992n,
      gasPrice: 1n,
    }),
  ).toEqual(receipt);
});

test("material purchase still respects quantity and total budget", async () => {
  orders = [order("10")];
  expect(
    await buyMaterialOrder("1", 2, signer, "dummy", "dummy", {
      maxTotalCost: 19n,
      gasPrice: 1n,
    }),
  ).toBe(false);
  expect(writes).toHaveLength(0);
  expect(
    await buyMaterialOrder("1", 11, signer, "dummy", "dummy", {
      maxTotalCost: 1000n,
      gasPrice: 1n,
    }),
  ).toBe(false);
});

const materialData = {
  address: BUYER,
  materialId: "1",
  quantity: "1",
  unitPrice: "10",
  endedUnitPrice: "0",
  startedAt: 1,
  endedAt: 0,
  expiredAt: expiry,
};
test.each([undefined, "0", "7"])(
  "material signing and API nonce agree: %s",
  async (nonce) => {
    await createMaterialMarketplaceOrder(
      materialData,
      "dummy",
      signer,
      "dummy",
      nonce === undefined ? undefined : { nonce },
    );
    const signature = signed[0];
    const sent = requests.find((r) => r.operationName === "CreateOrder")
      .variables.order;
    expect(BigInt(sent.nonce)).toBe(BigInt(signature.value.nonce));
    expect(sent.nonce).toBe(nonce === undefined ? 7 : Number(nonce));
    expect(makerNonceReads).toBe(nonce === undefined ? 1 : 0);
    expect(
      TypedDataEncoder.hash(signature.domain, signature.types, signature.value),
    ).toBe(
      TypedDataEncoder.hash(signature.domain, signature.types, {
        ...signature.value,
        nonce: sent.nonce,
      }),
    );
  },
);

test("unrepresentable material nonce rejects before signing or submission", async () => {
  await expect(
    createMaterialMarketplaceOrder(materialData, "dummy", signer, "dummy", {
      nonce: "9007199254740993",
    }),
  ).rejects.toThrow("exactly");
  expect(signed).toHaveLength(0);
  expect(requests).toHaveLength(0);
});

test("tiny positive floors retain all wei in each helper", async () => {
  expect(parseEther((await getAxieFloorPrice("dummy"))!)).toBe(100000000000n);
  for (const getFloor of [getMaterialFloorPrice, getConsumableFloorPrice]) {
    expect(parseEther((await getFloor("1", "dummy"))!)).toBe(100000000000n);
    expect(parseEther((await getFloor("1", "dummy", 2))!)).toBe(100000000000n);
  }
});

test("weighted floor calculation uses exact wei with final upward rounding", async () => {
  floorOrders = [order("1"), order("2")];
  for (const o of floorOrders) o.assets[0].availableQuantity = "1";
  for (const getFloor of [getMaterialFloorPrice, getConsumableFloorPrice]) {
    expect(parseEther((await getFloor("1", "dummy", 2))!)).toBe(2n);
    expect(await getFloor("1", "dummy", 3)).toBeNull();
  }
});

test("zero floor listings are excluded and ordinary prices still work", async () => {
  floorOrders = [order("0"), order("1000000000000000")];
  expect(await getAxieFloorPrice("dummy")).toBe("0.001");
  expect(await getMaterialFloorPrice("1", "dummy")).toBe("0.001");
  expect(await getConsumableFloorPrice("1", "dummy")).toBe("0.001");
});

test("all listing helpers reject zero before signing or requests", async () => {
  await expect(
    createMarketplaceOrder(
      {
        address: BUYER,
        axieId: "1",
        basePrice: "0",
        endedPrice: "0",
        startedAt: 1,
        endedAt: 0,
        expiredAt: expiry,
      },
      "dummy",
      signer,
      "dummy",
    ),
  ).rejects.toThrow("positive");
  await expect(
    createMaterialMarketplaceOrder(
      { ...materialData, unitPrice: "0" },
      "dummy",
      signer,
      "dummy",
    ),
  ).rejects.toThrow("positive");
  await expect(
    createConsumableMarketplaceOrder(
      { ...materialData, consumableId: "1", unitPrice: "0" },
      "dummy",
      signer,
      "dummy",
    ),
  ).rejects.toThrow("positive");
  expect(signed).toHaveLength(0);
  expect(requests).toHaveLength(0);
});

test("tiny floor prices remain positive in actual signing payloads", async () => {
  const axiePrice = parseEther((await getAxieFloorPrice("dummy"))!).toString();
  const materialPrice = parseEther(
    (await getMaterialFloorPrice("1", "dummy"))!,
  ).toString();
  const consumablePrice = parseEther(
    (await getConsumableFloorPrice("1", "dummy"))!,
  ).toString();
  await createMarketplaceOrder(
    {
      address: BUYER,
      axieId: "1",
      basePrice: axiePrice,
      endedPrice: "0",
      startedAt: 1,
      endedAt: 0,
      expiredAt: expiry,
    },
    "dummy",
    signer,
    "dummy",
  );
  await createMaterialMarketplaceOrder(
    { ...materialData, unitPrice: materialPrice },
    "dummy",
    signer,
    "dummy",
  );
  await createConsumableMarketplaceOrder(
    { ...materialData, consumableId: "1", unitPrice: consumablePrice },
    "dummy",
    signer,
    "dummy",
  );
  expect(signed.map((s) => s.value.basePrice ?? s.value.unitPrice)).toEqual([
    "100000000000",
    "100000000000",
    "100000000000",
  ]);
});

test.each([encodeMaterialOrderData, encodeConsumableOrderData])(
  "ERC1155 encoder preserves large IDs and quantities",
  (encode) => {
    const o = order();
    o.assets[0].id = "9007199254740993";
    o.assets[0].quantity = ((1n << 256n) - 1n).toString();
    const decoded = AbiCoder.defaultAbiCoder().decode(
      [erc1155Tuple],
      encode(o),
    )[0];
    expect(decoded[2][2]).toBe(9007199254740993n);
    expect(decoded[2][3]).toBe((1n << 256n) - 1n);
    o.assets[0].id = "1junk";
    expect(() => encode(o)).toThrow();
    o.assets[0].id = "-1";
    expect(() => encode(o)).toThrow();
  },
);

const mismatches = [
  (o: IOrder) => {
    o.assets[0].id = "2";
  },
  (o: IOrder) => {
    o.assets[0].id = "1junk";
  },
  (o: IOrder) => {
    o.assets[0].address = MATERIAL;
  },
  (o: IOrder) => {
    o.assets[0].erc = "Erc1155";
  },
  (o: IOrder) => {
    o.paymentToken = MATERIAL;
  },
  (o: IOrder) => {
    o.assets.push({ ...o.assets[0] });
  },
  (o: IOrder) => {
    o.assets = [];
  },
  (o: IOrder) => {
    o.kind = "Buy";
  },
];
test.each(mismatches)(
  "both cached and fetched purchases reject mismatched intent",
  async (mutate) => {
    const o = order();
    mutate(o);
    expect(
      await buyMarketplaceOrder(1, signer, "dummy", "dummy", {
        existingOrder: o,
        maxPrice: 100n,
      }),
    ).toBe(false);
    fetchedOrder = o;
    expect(
      await buyMarketplaceOrder(1, signer, "dummy", "dummy", {
        maxPrice: 100n,
      }),
    ).toBe(false);
    expect(balanceReads).toBe(0);
    expect(writes).toHaveLength(0);
  },
);

test.each(mismatches)(
  "both cached and fetched cancellations reject mismatched intent",
  async (mutate) => {
    const o = order();
    o.maker = BUYER;
    mutate(o);
    await expect(
      cancelMarketplaceOrder(1, signer, "dummy", { order: o }),
    ).rejects.toThrow();
    fetchedOrder = o;
    await expect(cancelMarketplaceOrder(1, signer, "dummy")).rejects.toThrow();
    expect(writes).toHaveLength(0);
  },
);

test("cancellation rejects another maker", async () => {
  await expect(
    cancelMarketplaceOrder(1, signer, "dummy", { order: order() }),
  ).rejects.toThrow("maker");
  expect(writes).toHaveLength(0);
});

test.each([0, 1])(
  "valid Axie quantity %i, normalized addresses and defaults remain usable",
  async (quantity) => {
    fetchedOrder.assets[0].address = getAddress(AXIE);
    fetchedOrder.assets[0].quantity = String(quantity);
    expect(
      await buyMarketplaceOrder(1, signer, "dummy", "dummy", {
        maxPrice: 10n,
        gasPrice: 1n,
      }),
    ).toEqual(receipt);
    fetchedOrder.maker = BUYER.replace("0x", "ronin:");
    expect(
      await cancelMarketplaceOrder(1, signer, "dummy", { gasPrice: 1n }),
    ).toEqual(receipt);
  },
);

test("cached purchase cannot mutate after validation", async () => {
  const o = order();
  beforeBalance = () => {
    o.assets[0].id = "2";
    o.currentPrice = "999";
  };
  expect(
    await buyMarketplaceOrder(1, signer, "dummy", "dummy", {
      existingOrder: o,
      maxPrice: 10n,
      gasPrice: 1n,
    }),
  ).toEqual(receipt);
  const settle = axieInterface.decodeFunctionData(
    "settleOrder",
    writes[0].data,
  );
  expect(
    AbiCoder.defaultAbiCoder().decode(
      [axieTuple],
      settle[0].orderData,
    )[0][2][0][2],
  ).toBe(1n);
  expect(settle[1]).toBe(10n);
});

test("cached cancellation is snapshotted before signer await", async () => {
  const o = order();
  o.maker = BUYER;
  const mutatingSigner = {
    getAddress: async () => {
      o.assets[0].id = "2";
      return BUYER;
    },
  } as any;
  expect(
    await cancelMarketplaceOrder(1, mutatingSigner, "dummy", {
      order: o,
      gasPrice: 1n,
    }),
  ).toEqual(receipt);
  const data = axieInterface.decodeFunctionData(
    "cancelOrder",
    writes[0].data,
  )[0];
  expect(AbiCoder.defaultAbiCoder().decode([axieTuple], data)[0][2][0][2]).toBe(
    1n,
  );
});
