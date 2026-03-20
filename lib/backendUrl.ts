import Constants from 'expo-constants';

const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  (Constants.expoConfig as any)?.extra?.backendUrl ||
  'http://localhost:3001';

export function getBackendUrl(): string {
  return BACKEND_URL;
}

