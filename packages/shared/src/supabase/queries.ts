import { SupabaseClient } from '@supabase/supabase-js';
import { AnalysisResult, CaptureItem, CaptureRow, CaptureCategory, PlaceInfo, PaginatedResult } from '../types/capture';
import { mapRowToCapture } from './mappers';

export async function getAllCaptures(
  client: SupabaseClient,
  options?: { cursor?: string; limit?: number }
): Promise<PaginatedResult> {
  const limit = options?.limit ?? 20;

  let query = client
    .from('captures')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit + 1); // 1개 더 조회해서 hasMore 판단

  if (options?.cursor) {
    query = query.lt('created_at', options.cursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = data as CaptureRow[];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].created_at : null;

  return {
    items: items.map(mapRowToCapture),
    nextCursor,
    hasMore,
  };
}

export async function getCapturesByCategory(
  client: SupabaseClient,
  category: CaptureCategory,
  options?: { cursor?: string; limit?: number }
): Promise<PaginatedResult> {
  const limit = options?.limit ?? 20;

  let query = client
    .from('captures')
    .select('*')
    .eq('category', category)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (options?.cursor) {
    query = query.lt('created_at', options.cursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = data as CaptureRow[];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].created_at : null;

  return {
    items: items.map(mapRowToCapture),
    nextCursor,
    hasMore,
  };
}

export async function searchCaptures(
  client: SupabaseClient,
  query: string,
  options?: { limit?: number; offset?: number }
): Promise<{ items: CaptureItem[]; total: number }> {
  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;
  const pattern = `%${query}%`;

  const baseQuery = client
    .from('captures')
    .select('*', { count: 'exact' })
    .or(
      `title.ilike.${pattern},summary.ilike.${pattern},extracted_text.ilike.${pattern}`
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await baseQuery;

  if (error) throw error;
  return {
    items: (data as CaptureRow[]).map(mapRowToCapture),
    total: count ?? 0,
  };
}

export async function saveCapture(
  client: SupabaseClient,
  analysis: AnalysisResult,
  imageUrl: string,
  userId?: string
): Promise<CaptureItem> {
  const insertData: Record<string, unknown> = {
    category: analysis.category,
    title: analysis.title,
    summary: analysis.summary,
    places: analysis.places,
    extracted_text: analysis.extractedText,
    links: analysis.links,
    tags: analysis.tags,
    source: analysis.source,
    image_url: imageUrl,
    confidence: analysis.confidence,
    source_account_id: analysis.sourceAccountId,
  };

  if (userId) {
    insertData.user_id = userId;
  }

  const { data, error } = await client
    .from('captures')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return mapRowToCapture(data as CaptureRow);
}

export async function deleteCapture(
  client: SupabaseClient,
  id: number
): Promise<void> {
  const { error } = await client.from('captures').delete().eq('id', id);
  if (error) throw error;
}

export async function getCaptureById(
  client: SupabaseClient,
  id: number
): Promise<CaptureItem | null> {
  const { data, error } = await client
    .from('captures')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return mapRowToCapture(data as CaptureRow);
}

export async function updateCapturePlaces(
  client: SupabaseClient,
  id: number,
  places: PlaceInfo[]
): Promise<CaptureItem> {
  const { data, error } = await client
    .from('captures')
    .update({ places })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapRowToCapture(data as CaptureRow);
}

export async function reclassifyCapture(
  client: SupabaseClient,
  id: number,
  category: CaptureCategory,
  places: PlaceInfo[] | null
): Promise<CaptureItem> {
  const { data, error } = await client
    .from('captures')
    .update({
      category,
      places: places ?? [],
      confidence: 1.0,
      reclassified_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapRowToCapture(data as CaptureRow);
}

export async function softDeleteCapture(
  client: SupabaseClient,
  id: number
): Promise<void> {
  const { error } = await client
    .from('captures')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Fire-and-forget upsert into user_activity.
 * Errors are caught and logged; never throws so callers can use without await blocking.
 */
export async function touchUserSeen(
  client: SupabaseClient,
  userId: string
): Promise<void> {
  if (!userId) return;
  const { error } = await client.rpc('touch_user_seen' as never, { _user_id: userId } as never);
  if (error) {
    console.error('[touchUserSeen]', error.message);
  }
}
