import type { SupabaseClient } from '@supabase/supabase-js';
import {
  parseGuestCaptures,
  serializeGuestCaptures,
  base64ToBlob,
  buildMigrationPayload,
  type GuestCapture,
} from '@scrave/shared';

const STORAGE_KEY = 'scrave_guest_captures';

export async function migrateGuestCaptures(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  const captures = parseGuestCaptures(raw);
  if (captures.length === 0) return 0;

  let migrated = 0;
  const remaining: GuestCapture[] = [];

  for (const gc of captures) {
    let uploadedPath: string | null = null;
    try {
      // 1. Upload image: base64 → blob → Supabase Storage
      const blob = base64ToBlob(gc.imageBase64);
      const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('captures')
        .upload(path, blob, { contentType: blob.type });

      if (uploadError) {
        console.error('Migration upload error:', uploadError);
        remaining.push(gc);
        continue;
      }
      uploadedPath = path;

      const { data: urlData } = supabase.storage.from('captures').getPublicUrl(path);

      // 2. Insert capture record
      const payload = buildMigrationPayload(gc, userId, urlData.publicUrl);
      const { error: insertError } = await supabase.from('captures').insert(payload);

      if (insertError) {
        console.error('Migration insert error:', insertError);
        await cleanupUploadedCapture(supabase, path);
        remaining.push(gc);
        continue;
      }

      migrated++;
    } catch (err) {
      console.error('Migration error for capture:', gc.id, err);
      if (uploadedPath) {
        await cleanupUploadedCapture(supabase, uploadedPath);
      }
      remaining.push(gc);
    }
  }

  if (remaining.length > 0) {
    sessionStorage.setItem(STORAGE_KEY, serializeGuestCaptures(remaining));
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  return migrated;
}

async function cleanupUploadedCapture(
  supabase: SupabaseClient,
  path: string,
): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from('captures')
      .remove([path]);
    if (error) {
      console.error('Migration cleanup error:', error);
    }
  } catch (err) {
    console.error('Migration cleanup error:', err);
  }
}
