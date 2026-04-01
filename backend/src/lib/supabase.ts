import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL environment variable is required.');
}

if (!supabaseAnonKey) {
  throw new Error('SUPABASE_ANON_KEY environment variable is required.');
}

if (!supabaseServiceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required.');
}

const sharedAuthOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
};

export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, sharedAuthOptions);

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  sharedAuthOptions
);
