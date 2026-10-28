import type { NextRequest } from 'next/server';
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import { extractBearerToken } from '@scrave/shared';
import { createClient } from '@/lib/supabase/server';

/**
 * Returns a Supabase client scoped to the request's auth context:
 * - If Authorization: Bearer <token> is provided (mobile app), creates a client with that JWT header so RLS policies see auth.uid().
 * - Otherwise returns the SSR cookie-based server client (web app).
 */
export async function createRequestClient(request: NextRequest) {
  const token = extractBearerToken(request.headers.get('authorization'));
  if (token) {
    return createSupabaseJsClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }
  return createClient();
}
