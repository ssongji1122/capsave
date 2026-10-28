'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { migrateGuestCaptures } from '@/lib/migrate-guest-captures';
import { useCaptures } from '@/contexts/CapturesContext';
import { useGuestCaptures } from '@/contexts/GuestCapturesContext';

export function GuestMigration() {
  const migrated = useRef(false);
  const { refresh, isAuthReady, isAuthenticated } = useCaptures();
  const { reloadCaptures } = useGuestCaptures();

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated || migrated.current) return;
    migrated.current = true;

    const run = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const count = await migrateGuestCaptures(supabase, user.id);
      reloadCaptures();
      if (count > 0) {
        await refresh();
      }
    };

    run().catch(console.error);
  }, [refresh, isAuthReady, isAuthenticated, reloadCaptures]);

  return null;
}
