import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || Constants.expoConfig?.extra?.supabaseAnonKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseConfigError =
  'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (Expo public env vars).';

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(supabaseConfigError);
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    // Persist sessions on native. On web, supabase-js uses localStorage by default.
    storage: Platform.OS === 'web' ? undefined : (AsyncStorage as any),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
}); 