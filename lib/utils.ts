import { confirm, number, password } from '@inquirer/prompts';

export async function apiRequest<T>(
  url: string,
  body: BodyInit | null = null,
  headers: Record<string, string> = {},
  method: 'GET' | 'POST' = 'POST',
) {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    ...(method === 'GET' ? {} : { body })
  })

  const res: T = await response.json()
  return res
}

export const askToContinue = async () => {
  const continueUsing = await confirm({
    message: '🔄 Would you like to do something else?'
  });
  if (!continueUsing) {
    console.log('👋 Goodbye!');
    process.exit(0);
  }
};

export async function ensureMarketplaceToken(): Promise<string> {
  if (!process.env.MARKETPLACE_ACCESS_TOKEN) {
    const token = await password({
      message: '🔑 Enter your Marketplace access token:',
      validate: (value) => value !== undefined && value !== ''
    });
    process.env.MARKETPLACE_ACCESS_TOKEN = token;
  }
  return process.env.MARKETPLACE_ACCESS_TOKEN!;
}

export const getAxieId = async () => {
  const axieId = await number({
    message: '🆔 Enter Axie ID:',
    validate: (value) => value !== undefined && !isNaN(value)
  });
  if (axieId === undefined) {
    console.log('❌ Invalid Axie ID!');
    return null;
  }
  return axieId;
};

