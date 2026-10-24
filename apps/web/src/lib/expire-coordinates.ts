import type { SupabaseClient } from '@supabase/supabase-js';
import { expireGeocodedPlaces, type PlaceInfo } from '@scrave/shared';

const PAGE_SIZE = 500;

/**
 * Google 약관(Geocoding 좌표는 최대 30일 보관)에 맞춰, 30일이 지난 지오코딩 좌표를
 * 모든 캡처에서 지웁니다. 서비스 역할 키로 만든 클라이언트를 넘겨야 합니다.
 */
export async function expireStoredCoordinates(
  client: SupabaseClient,
  now: Date,
  pageSize = PAGE_SIZE
): Promise<{ scanned: number; updated: number }> {
  let scanned = 0;
  let updated = 0;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client
      .from('captures')
      .select('id, places')
      .order('id')
      .range(from, from + pageSize - 1);
    if (error) throw error;

    const rows = (data ?? []) as Array<{ id: number; places: PlaceInfo[] | null }>;
    for (const row of rows) {
      scanned += 1;
      const result = expireGeocodedPlaces(row.places ?? [], now);
      if (!result.changed) continue;

      const { error: updateError } = await client
        .from('captures')
        .update({ places: result.places })
        .eq('id', row.id);
      if (updateError) throw updateError;
      updated += 1;
    }

    if (rows.length < pageSize) break;
  }

  return { scanned, updated };
}
