import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractBearerToken, getDayBoundaries, countDistinctUsers } from '@scrave/shared';
import { generateDauNotificationHtml } from '@/lib/notifications';

const DAU_THRESHOLD = 10;

/**
 * DAU counting endpoint for environments without pg_cron.
 * Call via Vercel Cron or external scheduler.
 * Requires CRON_SECRET env var for authentication.
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

  const { start, end } = getDayBoundaries();

  const { data: captures } = await supabase
    .from('captures')
    .select('user_id')
    .gte('created_at', start)
    .lt('created_at', end)
    .not('user_id', 'is', null);

  const distinctUsers = countDistinctUsers(captures ?? []);

  // Upsert DAU via SQL function (analytics schema not accessible via JS client)
  await supabase.rpc('count_dau' as never);

  // Check milestone and notify
  if (distinctUsers >= DAU_THRESHOLD) {
    const { data: dauRow } = await supabase.rpc('check_dau_notified' as never);
    const alreadyNotified = dauRow as unknown as boolean;

    if (!alreadyNotified) {
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
            html: generateDauNotificationHtml(distinctUsers, start),
          }),
        });

        await supabase.rpc('mark_dau_notified' as never);
      }
    }
  }

  return NextResponse.json({ date: start, dau: distinctUsers });
}
