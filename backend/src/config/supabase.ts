import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

// 1. Service Role Client (For trusted server operations, cron jobs, background workers)
export const supabaseAdmin: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// 2. Anonymous Client
export const supabaseAnon: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY
);

// 3. Authenticated User Client Builder (Transfers JWT into Supabase client to enforce RLS)
export function getAuthenticatedClient(accessToken?: string): SupabaseClient {
  if (!accessToken) {
    return supabaseAnon;
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
