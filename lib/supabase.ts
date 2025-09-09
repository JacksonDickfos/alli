import { createClient } from '@supabase/supabase-js';

const runtimeEnv: any = (globalThis as any).__env || {};
const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL as string) || runtimeEnv.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string) || runtimeEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn('Supabase env missing: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || ''); 