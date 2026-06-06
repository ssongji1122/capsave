import { createBrowserClient } from '@supabase/ssr';

// Use placeholder during SSG/build; real values are inlined at build time via NEXT_PUBLIC_
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const E2E_CLIENT_BYPASS_VALUE = '1';

type SupabaseBrowserClient = ReturnType<typeof createBrowserClient>;

declare global {
  interface Window {
    __SCRAVE_E2E_SUPABASE_CLIENT__?: SupabaseBrowserClient;
  }
}

export function createClient(): SupabaseBrowserClient {
  if (
    process.env.NEXT_PUBLIC_SCRAVE_E2E_CLIENT_BYPASS === E2E_CLIENT_BYPASS_VALUE &&
    typeof window !== 'undefined' &&
    window.__SCRAVE_E2E_SUPABASE_CLIENT__
  ) {
    return window.__SCRAVE_E2E_SUPABASE_CLIENT__;
  }

  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
