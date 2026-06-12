// Not working, it is asking for captcha now, you can try to fix it by adding captcha solver, refresh still working if you have a valid access token
import { apiRequest } from "../utils";

const AUTH_NONCE_URL =
  "https://athena.skymavis.com/v2/public/auth/ronin/fetch-nonce";
const AUTH_LOGIN_URL = "https://athena.skymavis.com/v2/public/auth/ronin/login";
const AUTH_TOKEN_REFRESH_URL =
  "https://athena.skymavis.com/v2/public/auth/token/refresh";

interface IAuthFetchNonceResponse {
  nonce: string;
  issued_at: string;
  not_before: string;
  expiration_time: string;
}

interface IAuthLoginResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  userID: string;
  enabled_mfa: boolean;
}

export interface TokenExpirationInfo {
  expiresAt: Date;
  expiresIn: number;
  isExpired: boolean;
  humanReadable: string;
}

interface JWTPayload {
  exp?: number;
  [key: string]: unknown;
}

const decodeJWT = (token: string): JWTPayload => {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");

  const payload = parts[1];
  const decoded = Buffer.from(payload, "base64").toString("utf-8");
  return JSON.parse(decoded);
};

export const isTokenExpired = (token: string): boolean => {
  const payload = decodeJWT(token);
  if (!payload.exp) throw new Error("Token missing exp claim");

  return Date.now() >= payload.exp * 1000;
};

export const getTokenExpirationInfo = (token: string): TokenExpirationInfo => {
  const payload = decodeJWT(token);
  if (!payload.exp) throw new Error("Token missing exp claim");

  const expiresAt = new Date(payload.exp * 1000);
  const now = Date.now();
  const expiresInMs = expiresAt.getTime() - now;
  const expiresInSeconds = Math.floor(expiresInMs / 1000);
  const isExpired = expiresInSeconds <= 0;

  let humanReadable: string;
  if (isExpired) {
    const pastSeconds = Math.abs(expiresInSeconds);
    const hours = Math.floor(pastSeconds / 3600);
    const minutes = Math.floor((pastSeconds % 3600) / 60);
    humanReadable =
      hours > 0
        ? `expired ${hours}h ${minutes}m ago`
        : `expired ${minutes}m ago`;
  } else {
    const hours = Math.floor(expiresInSeconds / 3600);
    const minutes = Math.floor((expiresInSeconds % 3600) / 60);
    humanReadable =
      hours > 0 ? `expires in ${hours}h ${minutes}m` : `expires in ${minutes}m`;
  }

  return {
    expiresAt,
    expiresIn: expiresInSeconds,
    isExpired,
    humanReadable,
  };
};

// Taken from https://github.com/SM-Trung-Le/temp-accessToken
export const generateAccessTokenMessage = async (
  address: string,
  domain = `YOUR_DOMAIN_GOES_HERE`,
  uri = "https://YOUR_APP_URI",
  statement = `YOUR_STATEMENT`,
) => {
  const data = await exchangeNonce(address);
  const message = `${domain} wants you to sign in with your Ronin account:\n${address.replace("0x", "ronin:").toLowerCase()}\n\n${statement}\n\nURI: ${uri}\nVersion: 1\nChain ID: 2020\nNonce: ${data.nonce}\nIssued At: ${data.issued_at}\nExpiration Time: ${data.expiration_time}\nNot Before: ${data.not_before}`;
  /* 
      Example message: 
      app.axieinfinity.com wants you to sign in with your Ronin account: ronin:af9d50d8e6e19e3163583f293bb9b457cd28e8af I accept the Terms of Use (https://axieinfinity.com/terms-of-use) and the Privacy Policy (https://axieinfinity.com/privacy-policy) URI: https://app.axieinfinity.com Version: 1 Chain ID: 2020 Nonce: 13706446796901304963 Issued At: 2023-06-16T14:05:11Z Expiration Time: 2023-06-16T14:05:41Z Not Before: 2023-06-16T14:05:11Z
  */
  return message;
};

export const exchangeToken = async (signature: string, message: string) => {
  const data = await apiRequest<IAuthLoginResponse>(
    AUTH_LOGIN_URL,
    JSON.stringify({ signature, message }),
  );

  if (!data.accessToken) {
    throw new Error("No access token");
  }

  const expirationInfo = getTokenExpirationInfo(data.accessToken);

  return {
    ...data,
    expirationInfo,
  };
};

export const exchangeNonce = async (address: string) => {
  const headers = {};
  const data = await apiRequest<IAuthFetchNonceResponse>(
    `${AUTH_NONCE_URL}?address=${address}`,
    null,
    headers,
    "GET",
  );

  if (!data.nonce) {
    throw new Error("No access token");
  }

  return data;
};

export default {};

export const refreshToken = async (refreshToken: string) => {
  const data = await apiRequest<IAuthLoginResponse>(
    AUTH_TOKEN_REFRESH_URL,
    JSON.stringify({ refreshToken }),
  );
  const newAccessToken = data.accessToken;
  const newRefreshToken = data.refreshToken;
  if (!newAccessToken || !newRefreshToken) {
    throw new Error(
      "Error refreshing token, API response: " + JSON.stringify(data),
    );
  }

  const expirationInfo = getTokenExpirationInfo(newAccessToken);

  return {
    newAccessToken,
    newRefreshToken,
    expirationInfo,
  };
};
