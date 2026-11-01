import type { SupabaseClient } from '@supabase/supabase-js';
import { buildArchiveLinks, buildSourceQuery, mapRowToCapture, safeArchiveUrl, type CaptureRow } from '@scrave/shared';
import { collectArchiveSources } from './archive-sources';

/** Search stored public place details; never accept client-supplied links or another user's row. */
export async function findAndSaveArchiveSources(
  client: SupabaseClient,
  userId: string,
  captureId: number,
  search = collectArchiveSources,
) {
  const { data, error } = await client.from('captures').select('*')
    .eq('id', captureId).eq('user_id', userId).is('deleted_at', null).single();
  if (error || !data) throw new Error('캡처를 찾을 수 없습니다.');
  const capture = mapRowToCapture(data as CaptureRow);
  const query = buildSourceQuery(capture);
  const results = query ? await search(query) : [];
  const links = [...new Set([
    ...capture.links,
    ...buildArchiveLinks(capture).filter(link => link.kind === 'map').map(link => link.url),
    ...results.map(result => safeArchiveUrl(result.url)).filter((url): url is string => url !== null),
  ])];
  const { data: updated, error: saveError } = await client.from('captures').update({ links })
    .eq('id', captureId).eq('user_id', userId).is('deleted_at', null)
    .eq('links', JSON.stringify(data.links)).select('id');
  if (saveError || !updated?.length) throw new Error('저장 중 변경이 있습니다. 다시 시도하십시오.');
  return { results, query, status: 'candidate' as const, saved: true, links };
}
