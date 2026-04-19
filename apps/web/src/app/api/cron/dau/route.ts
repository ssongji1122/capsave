import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractBearerToken } from '@scrave/shared';
import { generateDauNotificationHtml } from '@/lib/notifications';
import { DAU_THRESHOLD, shouldNotify } from '@/lib/dau-counter';

/**
 * DAU counting endpoint for environments without pg_cron.
 * Call via Vercel Cron or external scheduler. Requires CRON_SECRET env var.
 *
 * Reads session DAU from user_activity (not captures) — count_dau() now counts
 * distinct users who hit any authenticated API today, populated by touch_user_seen.
 */
export async function GET(request: NextRequest) {
  const token = extractBearerToken(request.headers.get('authorization'));
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || token !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Refresh today's analytics.dau row from user_activity
  await supabase.rpc('count_dau' as never);

  // 2. Read it back (distinct_users + notified flag)
  const { data: dauRow } = await supabase.rpc('get_dau_today' as never);
  const row = (Array.isArray(dauRow) ? dauRow[0] : dauRow) as
    | { distinct_users: number; notified: boolean }
    | null
    | undefined;

  const distinctUsers = row?.distinct_users ?? 0;
  const alreadyNotified = row?.notified ?? false;

  const today = new Date().toISOString().split('T')[0];

  if (shouldNotify(distinctUsers, DAU_THRESHOLD, alreadyNotified)) {
    const resendKey = process.env.RESEND_API_KEY;
    const ownerEmail = process.env.OWNER_EMAIL;

    if (resendKey && ownerEmail) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Scrave <noreply@scrave.app>',
          to: [ownerEmail],
          subject: `Scrave Phase 1 Validated — DAU ${distinctUsers} reached!`,
          html: generateDauNotificationHtml(distinctUsers, today),
        }),
      });

      await supabase.rpc('mark_dau_notified' as never);
    }
  }

  return NextResponse.json({ date: today, dau: distinctUsers });
}
