import { getBackendUrl } from '../../lib/backendUrl';
import { getOuraRedirectUriValue } from './ouraOAuth';

type ExchangeOuraCodeResponse = {
  success?: boolean;
  error?: string;
  details?: Record<string, unknown>;
  token_type?: string;
  expires_in?: number;
  scope?: string;
};

export async function exchangeOuraAuthCode(code: string, redirectUri?: string): Promise<ExchangeOuraCodeResponse> {
  const backendUrl = getBackendUrl();
  const url = `${backendUrl}/integrations/oura/oauth/exchange`;

  const BACKEND_API_KEY = process.env.EXPO_PUBLIC_BACKEND_API_KEY as string | undefined;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(BACKEND_API_KEY ? { 'x-api-key': BACKEND_API_KEY } : {}),
    },
    body: JSON.stringify({
      code,
      redirectUri: redirectUri || getOuraRedirectUriValue(),
    }),
  });

  const data = (await response.json().catch(() => ({}))) as ExchangeOuraCodeResponse;
  if (!response.ok || !data?.success) {
    const base =
      data?.error ||
      (response.status === 404
        ? 'Oura exchange failed (404). Set EXPO_PUBLIC_BACKEND_URL to your deployed API (backend/), not localhost, on a physical device.'
        : `Oura OAuth exchange failed (${response.status})`);
    const detail =
      data?.details && typeof data.details === 'object'
        ? `\n\n${JSON.stringify(data.details, null, 2)}`
        : '';
    throw new Error(base + detail);
  }

  return data;
}

