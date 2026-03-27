import { SupabaseClient } from '@supabase/supabase-js';
import { AnalysisResult, CaptureItem, CaptureRow, CaptureCategory } from '../types/capture';
import { mapRowToCapture } from './mappers';

export async function getAllCaptures(client: SupabaseClient): Promise<CaptureItem[]> {
  const { data, error } = await client
    .from('captures')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as CaptureRow[]).map(mapRowToCapture);
}

export async function getCapturesByCategory(
  client: SupabaseClient,
  category: CaptureCategory
): Promise<CaptureItem[]> {
  const { data, error } = await client
    .from('captures')
    .select('*')
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as CaptureRow[]).map(mapRowToCapture);
}

export async function searchCaptures(
  client: SupabaseClient,
  query: string
): Promise<CaptureItem[]> {
  const pattern = `%${query}%`;
  const { data, error } = await client
    .from('captures')
    .select('*')
    .or(
      `title.ilike.${pattern},summary.ilike.${pattern},extracted_text.ilike.${pattern}`
    )
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as CaptureRow[]).map(mapRowToCapture);
}

export async function saveCapture(
  client: SupabaseClient,
  analysis: AnalysisResult,
  imageUrl: string
): Promise<CaptureItem> {
  const { data, error } = await client
    .from('captures')
    .insert({
      category: analysis.category,
      title: analysis.title,
      summary: analysis.summary,
      places: analysis.places,
      extracted_text: analysis.extractedText,
      links: analysis.links,
      tags: analysis.tags,
      source: analysis.source,
      image_url: imageUrl,
    })
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
