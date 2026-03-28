import type { SupabaseClient } from '@supabase/supabase-js';
import {
  parseGuestCaptures,
  base64ToBlob,
  buildMigrationPayload,
} from '@capsave/shared';

const STORAGE_KEY = 'capsave_guest_captures';

export async function migrateGuestCaptures(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  const captures = parseGuestCaptures(raw);
  if (captures.length === 0) return 0;

  let migrated = 0;

  for (const gc of captures) {
    try {
      // 1. Upload image: base64 → blob → Supabase Storage
      const blob = base64ToBlob(gc.imageBase64);
      const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('captures')
        .upload(path, blob, { contentType: blob.type });

      if (uploadError) {
        console.error('Migration upload error:', uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage.from('captures').getPublicUrl(path);

      // 2. Insert capture record
      const payload = buildMigrationPayload(gc, userId, urlData.publicUrl);
      const { error: insertError } = await supabase.from('captures').insert(payload);

      if (insertError) {
        console.error('Migration insert error:', insertError);
        continue;
      }

      migrated++;
    } catch (err) {
      console.error('Migration error for capture:', gc.id, err);
    }
  }

  // Clear guest data after migration
  sessionStorage.removeItem(STORAGE_KEY);

  return migrated;
}
