import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Alert, Linking } from 'react-native';

const OURA_AUTHORIZATION_BASE_URL = 'https://cloud.ouraring.com/oauth/authorize';
const OURA_DEFAULT_CLIENT_ID = 'b40a8819-abfe-4d91-8409-f02746ac6ac6';
const REDIRECT_URI_CUSTOM = 'alli://oauth/oura';
const REDIRECT_URI_EXPO_GO = 'exp+alli-nutrition-app://oauth/oura';
const OURA_DEFAULT_SCOPES = [
  'email',
  'personal',
  'daily',
  'heartrate',
  'tag',
  'workout',
  'session',
  'spo2',
  'ring_configuration',
  'stress',
  'heart_health',
];

const OURA_STATE_STORAGE_KEY = 'oura_oauth_state';

export type OuraAuthRedirectResult = {
  code?: string;
  error?: string;
  state?: string;
  scope?: string;
};

function getOuraClientId(): string {
  return process.env.EXPO_PUBLIC_OURA_CLIENT_ID || OURA_DEFAULT_CLIENT_ID;
}

function getOuraRedirectUri(): string {
  if (process.env.EXPO_PUBLIC_OURA_REDIRECT_URI)
    return process.env.EXPO_PUBLIC_OURA_REDIRECT_URI;
  // In Expo Go only exp+ scheme is registered; custom scheme works in dev/production builds
  const isExpoGo = Constants.appOwnership === 'expo';
  return isExpoGo ? REDIRECT_URI_EXPO_GO : REDIRECT_URI_CUSTOM;
}

export function isOuraRedirectUrl(url: string): boolean {
  // Expected: alli://oauth/oura?code=...&state=...
  // Support both:
  // - custom dev scheme: alli://oauth/oura (requires a dev build)
  // - Expo Go compatible scheme: exp+alli-nutrition-app://oauth/oura
  return /^(?:alli|exp\+alli-nutrition-app):\/\/oauth\/oura\/?(?:\?.*)?$/.test(url);
}

export function parseOuraAuthRedirect(url: string): OuraAuthRedirectResult | null {
  if (!isOuraRedirectUrl(url)) return null;

  const queryStart = url.indexOf('?');
  const query = queryStart >= 0 ? url.slice(queryStart + 1) : '';
  const params = new URLSearchParams(query);

  const code = params.get('code') || undefined;
  const error = params.get('error') || undefined;
  const state = params.get('state') || undefined;
  const scope = params.get('scope') || undefined;

  // If Oura redirected with an error param, treat it as an error even if code is missing.
  return { code, error, state, scope };
}

export function buildOuraAuthorizationUrl(state: string): string {
  const clientId = getOuraClientId();
  const redirectUri = getOuraRedirectUri();

  const params = new URLSearchParams();
  params.set('response_type', 'code');
  params.set('client_id', clientId);
  params.set('redirect_uri', redirectUri);
  params.set('scope', OURA_DEFAULT_SCOPES.join(' '));
  params.set('state', state);

  return `${OURA_AUTHORIZATION_BASE_URL}?${params.toString()}`;
}

export async function startOuraAuthorization(): Promise<void> {
  try {
    const state = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    await AsyncStorage.setItem(OURA_STATE_STORAGE_KEY, state);

    const authorizationUrl = buildOuraAuthorizationUrl(state);
    const supported = await Linking.canOpenURL(authorizationUrl);
    if (!supported) {
      Alert.alert('Oura connect', 'Unable to open the Oura authorization page.');
      return;
    }

    await Linking.openURL(authorizationUrl);
  } catch (e) {
    console.error('Failed to start Oura authorization:', e);
    Alert.alert('Oura connect failed', 'Please try again.');
  }
}

export async function verifyOuraRedirectState(stateFromRedirect: string | undefined): Promise<boolean> {
  if (!stateFromRedirect) return true;
  const expectedState = await AsyncStorage.getItem(OURA_STATE_STORAGE_KEY);
  if (!expectedState) return true;
  return expectedState === stateFromRedirect;
}

export async function clearOuraRedirectState(): Promise<void> {
  await AsyncStorage.removeItem(OURA_STATE_STORAGE_KEY);
}

export function getOuraRedirectUriValue(): string {
  return getOuraRedirectUri();
}

