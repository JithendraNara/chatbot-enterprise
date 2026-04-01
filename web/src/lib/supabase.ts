import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || __SUPABASE_URL__;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || __SUPABASE_ANON_KEY__;

if (!supabaseUrl) {
  throw new Error('Supabase URL is required.');
}

if (!supabaseAnonKey) {
  throw new Error('Supabase anon key is required.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
