import type { Network } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm";
import {
  decodePaymentResponseHeader,
  wrapFetchWithPaymentFromConfig,
} from "@x402/fetch";
import "dotenv/config";
import { privateKeyToAccount } from "viem/accounts";

const privateKey = process.env.EVM_PRIVATE_KEY;
const apiUrl = process.env.API_URL ?? "http://localhost:4021/paid/axie-floor";
const network = (process.env.X402_NETWORK ?? "eip155:84532") as Network;

if (!privateKey) {
  throw new Error("Missing required env var: EVM_PRIVATE_KEY");
}

const account = privateKeyToAccount(privateKey as `0x${string}`);
const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [
    {
      network,
      client: new ExactEvmScheme(account),
    },
  ],
});

const response = await fetchWithPayment(apiUrl);
const data = await response.json();
const paymentResponse = response.headers.get("PAYMENT-RESPONSE");

console.log(JSON.stringify(data, null, 2));

if (paymentResponse) {
  console.log(
    JSON.stringify(decodePaymentResponseHeader(paymentResponse), null, 2),
  );
}
