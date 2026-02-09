import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// NOTE: In some bare/TestFlight builds, `Constants.expoConfig?.extra` can be missing/empty.
// If we call `createClient('', '')` at import-time, the app can blank-screen before React renders.
const extra: any =
  (Constants.expoConfig as any)?.extra ||
  (Constants as any)?.manifest?.extra ||
  (Constants as any)?.manifest2?.extra ||
  {};

// Public defaults (safe to ship). This avoids startup crashes if Expo "extra" isn't available at runtime.
const DEFAULT_SUPABASE_URL = 'https://rkkoppppcxvbdzudzijw.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJra29wcHBwY3h2YmR6dWR6aWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNDExNDcsImV4cCI6MjA3NTYxNzE0N30.oLg5LsMNfuyuN3Vd_E0d1MQBQ5autzX1ZczczpthsgM';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  extra?.supabaseUrl ||
  DEFAULT_SUPABASE_URL;

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  extra?.supabaseAnonKey ||
  DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseConfigError =
  'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (Expo public env vars).';

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(supabaseConfigError);
}

// Create client only when we have something non-empty (prevents import-time crash -> white screen)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist sessions on native. On web, supabase-js uses localStorage by default.
    storage: Platform.OS === 'web' ? undefined : (AsyncStorage as any),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
    })
  : (null as any);