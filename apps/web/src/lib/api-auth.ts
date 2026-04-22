import { NextRequest } from 'next/server';
import { createSupabaseClient, extractBearerToken, touchUserSeen } from '@scrave/shared';
import { createClient } from '@/lib/supabase/server';

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
    if (user) {
      void touchUserSeen(supabase, user.id);
    }
    return user;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    void touchUserSeen(supabase, user.id);
  }
  return user;
}
