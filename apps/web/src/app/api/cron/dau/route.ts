import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const DAU_THRESHOLD = 10;

/**
 * DAU counting endpoint for environments without pg_cron.
 * Call via Vercel Cron or external scheduler.
 * Requires CRON_SECRET env var for authentication.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Count distinct users who created captures today
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const { data: captures } = await supabase
    .from('captures')
    .select('user_id')
    .gte('created_at', today)
    .lt('created_at', tomorrow)
    .not('user_id', 'is', null);

  const distinctUsers = new Set(captures?.map((c) => c.user_id)).size;

  // Upsert DAU via SQL function (analytics schema not accessible via JS client)
  await supabase.rpc('count_dau' as never);

  // Check milestone and notify
  if (distinctUsers >= DAU_THRESHOLD) {
    // Check if already notified (use raw SQL via rpc)
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
            from: 'CapSave <noreply@capsave.app>',
            to: [ownerEmail],
            subject: `CapSave Phase 1 Validated — DAU ${distinctUsers} reached!`,
            html: `<h2>Phase 1 Validation Gate Passed</h2>
              <p>CapSave has reached <strong>${distinctUsers} daily active users</strong> today (${today}).</p>
              <p>Time to move to Phase 2 growth features.</p>`,
          }),
        });

        // Mark as notified
        await supabase.rpc('mark_dau_notified' as never);
      }
    }
  }

  return NextResponse.json({ date: today, dau: distinctUsers });
}
