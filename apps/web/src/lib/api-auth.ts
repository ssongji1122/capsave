import { NextRequest } from 'next/server';
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import { createSupabaseClient, extractBearerToken, touchUserSeen } from '@scrave/shared';
import { createClient } from '@/lib/supabase/server';
import { getRealUserId } from '@/lib/auth-user';

/**
 * Resolve the authenticated user from a request (Bearer token first, cookie fallback).
 * Side effect: fire-and-forget upsert into user_activity for session-DAU tracking.
 *
 * Returns null for unauthenticated requests (no error thrown).
 */
export async function getAuthUserAndTouch(request: NextRequest) {
  const token = extractBearerToken(request.headers.get('authorization'));

  if (token) {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user } } = await supabase.auth.getUser(token);
    const userId = getRealUserId(user);
    if (userId) {
      void touchUserSeen(supabase, userId);
      return user;
    }
    return null;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = getRealUserId(user);
  if (userId) {
    void touchUserSeen(supabase, userId);
    return user;
  }
  return null;
}

/**
 * Returns a Supabase client scoped to the request's auth context:
 * - If Authorization: Bearer <token> is provided (mobile app), creates a client with that JWT header so RLS policies see auth.uid().
 * - Otherwise returns the SSR cookie-based server client (web app).
 */
export async function getRequestSupabaseClient(request: NextRequest) {
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
