import { SupabaseClient } from '@supabase/supabase-js';
import { AnalysisResult, CaptureItem, CaptureRow, CaptureCategory, PlaceInfo, PaginatedResult } from '../types/capture';
import {
  PublicGuide,
  SavedGuideRow,
  SavedGuideRecord,
  SavedGuideSummary,
  SaveGuideInput,
  UpdateGuideInput,
} from '../types/guide';
import { mapCaptureToRow, mapRowToCapture } from './mappers';
import { extractStoragePath } from '../utils/storage';

export const MAX_FREE_CAPTURES = 100;
export const MAX_GUIDES_PER_USER = 20;

export async function countUserCaptures(
  client: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await client
    .from('captures')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (error) throw error;
  return count ?? 0;
}

export async function getAllCaptures(
  client: SupabaseClient,
  options?: { cursor?: string; limit?: number }
): Promise<PaginatedResult> {
  const limit = options?.limit ?? 20;

  let query = client
    .from('captures')
    .select('*')
    .is('deleted_at', null)
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
    .is('deleted_at', null)
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
  const trimmed = query.trim();
  if (!trimmed) return { items: [], total: 0 };

  // Use the SQL RPC (migration 012) so JSONB columns (places, tags) participate
  // in the search via ::text ILIKE — PostgREST .or() doesn't reliably accept ::text cast.
  // RLS is preserved because the function is SECURITY INVOKER.
  const { data, error } = await client.rpc('search_user_captures', {
    search_query: trimmed,
    search_limit: limit,
    search_offset: offset,
  });

  if (error) throw error;
  const rows = (data ?? []) as CaptureRow[];
  return {
    items: rows.map(mapRowToCapture),
    total: rows.length,
  };
}

export async function saveCapture(
  client: SupabaseClient,
  analysis: AnalysisResult,
  imageUrl: string,
  userId?: string
): Promise<CaptureItem> {
  const insertData = mapCaptureToRow({
    category: analysis.category,
    title: analysis.title,
    summary: analysis.summary,
    places: analysis.places,
    extractedText: analysis.extractedText,
    links: analysis.links,
    tags: analysis.tags,
    source: analysis.source,
    imageUrl,
    confidence: analysis.confidence,
    sourceAccountId: analysis.sourceAccountId,
  });

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
  const { data, error } = await client
    .from('captures')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select('image_url');

  if (error) throw error;

  // Best-effort storage cleanup: only owned bucket paths qualify.
  // data:/file:// previews and external http URLs are not storage objects.
  const rows = (data ?? []) as Array<{ image_url: string | null }>;
  const imageUrl = rows[0]?.image_url ?? '';
  const path = extractStoragePath(imageUrl);
  if (
    path &&
    !path.startsWith('data:') &&
    !path.startsWith('file://') &&
    !path.startsWith('http')
  ) {
    const { error: removeError } = await client.storage.from('captures').remove([path]);
    if (removeError) {
      console.warn('[deleteCapture] storage cleanup failed:', removeError);
    }
  }
}

export async function getCaptureById(
  client: SupabaseClient,
  id: number
): Promise<CaptureItem | null> {
  const { data, error } = await client
    .from('captures')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
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
    .is('deleted_at', null)
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
    .is('deleted_at', null)
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

// --- Guides (Migration 014) ---

export function extractGuideSourceCaptureIds(guide: PublicGuide): number[] {
  const ids = new Set<number>();
  for (const place of guide.places) {
    for (const id of place.sourceCaptureIds ?? []) {
      if (Number.isInteger(id) && id > 0) {
        ids.add(id);
      }
    }
  }
  return [...ids];
}

export function toShareableGuideBody(guide: PublicGuide): PublicGuide {
  return {
    ...guide,
    places: guide.places.map(({ sourceCaptureIds: _removed, ...rest }) => ({
      ...rest,
    })),
  };
}

function mapRowToSavedGuideRecord(row: SavedGuideRow): SavedGuideRecord {
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    body: row.body,
    status: row.status,
    visibility: row.visibility,
    sourceCaptureIds: row.source_capture_ids ?? [],
    sharedAt: row.shared_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToSavedGuideSummary(row: SavedGuideRow): SavedGuideSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    placeCount: Array.isArray(row.body?.places) ? row.body.places.length : 0,
    status: row.status,
    visibility: row.visibility,
    sharedAt: row.shared_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function saveGuide(
  client: SupabaseClient,
  userId: string,
  input: SaveGuideInput
): Promise<SavedGuideRecord> {
  const status = input.status ?? 'ready';
  const visibility = input.visibility ?? 'private';
  const sourceCaptureIds = extractGuideSourceCaptureIds(input.guide);
  const shareableBody: PublicGuide = {
    ...toShareableGuideBody(input.guide),
    status,
  };

  const insertPayload = {
    user_id: userId,
    slug: input.guide.slug,
    title: input.guide.title.slice(0, 120),
    description: input.guide.description.slice(0, 400),
    body: shareableBody,
    status,
    visibility,
    source_capture_ids: sourceCaptureIds,
    generation: input.generation ?? {},
    shared_at: visibility === 'unlisted' ? new Date().toISOString() : null,
  };

  const { data, error } = await client
    .from('guides')
    .insert(insertPayload)
    .select()
    .single();

  if (error) throw error;
  return mapRowToSavedGuideRecord(data as SavedGuideRow);
}

export async function listMyGuides(
  client: SupabaseClient
): Promise<SavedGuideSummary[]> {
  const { data, error } = await client
    .from('guides')
    .select('*')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as SavedGuideRow[]).map(mapRowToSavedGuideSummary);
}

export async function getMyGuideById(
  client: SupabaseClient,
  id: string
): Promise<SavedGuideRecord | null> {
  const { data, error } = await client
    .from('guides')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return mapRowToSavedGuideRecord(data as SavedGuideRow);
}

export async function updateGuide(
  client: SupabaseClient,
  id: string,
  input: UpdateGuideInput
): Promise<SavedGuideRecord> {
  const patch: Record<string, unknown> = {};

  if (input.status) {
    patch.status = input.status;
  }
  if (input.visibility) {
    patch.visibility = input.visibility;
    if (input.visibility === 'unlisted') {
      patch.shared_at = new Date().toISOString();
    }
  }
  if (input.guide) {
    const nextStatus = input.status ?? (input.guide.status === 'draft' ? 'draft' : 'ready');
    const cleanBody: PublicGuide = {
      ...toShareableGuideBody(input.guide),
      status: nextStatus,
    };
    patch.title = input.guide.title.slice(0, 120);
    patch.description = input.guide.description.slice(0, 400);
    patch.body = cleanBody;
    const extractedIds = extractGuideSourceCaptureIds(input.guide);
    if (extractedIds.length > 0) {
      patch.source_capture_ids = extractedIds;
    }
  }

  const { data, error } = await client
    .from('guides')
    .update(patch)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) throw error;
  return mapRowToSavedGuideRecord(data as SavedGuideRow);
}

export async function softDeleteGuide(
  client: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await client
    .from('guides')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function getSharedGuideBySlug(
  client: SupabaseClient,
  slug: string
): Promise<PublicGuide | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;

  const { data, error } = await client.rpc('get_shared_guide', {
    p_slug: trimmed,
  });

  if (error) throw error;
  const rows = (data ?? []) as Array<{
    slug: string;
    title: string;
    description: string;
    body: PublicGuide;
    updated_at: string;
  }>;
  const row = rows[0];
  if (!row || !row.body) return null;

  return {
    ...toShareableGuideBody(row.body),
    slug: row.slug,
    title: row.title,
    description: row.description,
    status: 'published',
    updatedAt: row.updated_at ? row.updated_at.slice(0, 10) : row.body.updatedAt,
  };
}
