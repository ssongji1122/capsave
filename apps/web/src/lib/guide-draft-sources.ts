import type { SupabaseClient } from '@supabase/supabase-js';
import { AI_MODEL_ENDPOINT, mapRowToCapture, type CaptureItem, type CaptureRow } from '@scrave/shared';
import { extractGeminiText } from '@/lib/gemini';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const GUIDE_MODEL_TEMPERATURE = 0.2;

// Reads the signed-in user's own live captures, keeping the order the user picked them in.
export async function getUserCapturesByIds(
  client: SupabaseClient,
  userId: string,
  captureIds: number[],
): Promise<CaptureItem[]> {
  const { data, error } = await client
    .from('captures')
    .select('*')
    .eq('user_id', userId)
    .in('id', captureIds)
    .is('deleted_at', null);

  if (error) throw error;

  const byId = new Map(
    ((data as CaptureRow[] | null) ?? []).map((row) => [row.id, mapRowToCapture(row)])
  );
  return captureIds.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
}

// Text-only Gemini call for the guide prompt. Returns null when no key is configured.
export function createGuideModelCaller(
  apiKey: string | undefined,
  fetchImpl: FetchLike = fetch,
): ((prompt: string) => Promise<string | null>) | null {
  if (!apiKey) return null;

  return async (prompt) => {
    const response = await fetchImpl(`${AI_MODEL_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: GUIDE_MODEL_TEMPERATURE,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!response.ok) throw new Error(`Gemini returned ${response.status}`);
    const data = (await response.json()) as { candidates?: Parameters<typeof extractGeminiText>[0] };
    return extractGeminiText(data.candidates);
  };
}
