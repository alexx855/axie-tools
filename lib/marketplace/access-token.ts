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

  return data;
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
  return { newAccessToken, newRefreshToken };
};
