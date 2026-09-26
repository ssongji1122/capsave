import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AI_MODEL_ENDPOINT } from '@scrave/shared';
import { createGuideModelCaller, getUserCapturesByIds } from '@/lib/guide-draft-sources';

const ROW = {
  id: 5,
  category: 'place',
  title: '해변',
  summary: '작은 해변',
  places: [{ name: 'Padang Padang Beach', lat: -8.81, lng: 115.1 }],
  extracted_text: '',
  links: [],
  tags: [],
  source: 'instagram',
  image_url: 'captures/u/5.jpg',
  created_at: '2026-09-20T00:00:00Z',
  user_id: 'user-1',
  confidence: 0.9,
  reclassified_at: null,
  deleted_at: null,
  source_account_id: null,
};

function fakeClient(rows: unknown[], error: unknown = null) {
  const calls: Record<string, unknown[]> = {};
  const builder = {
    select: (...args: unknown[]) => ((calls.select = args), builder),
    eq: (...args: unknown[]) => ((calls.eq = args), builder),
    in: (...args: unknown[]) => ((calls.in = args), builder),
    is: (...args: unknown[]) => ((calls.is = args), builder),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows, error }).then(resolve),
  };
  return {
    client: { from: (table: string) => ((calls.from = [table]), builder) } as unknown as SupabaseClient,
    calls,
  };
}

describe('getUserCapturesByIds', () => {
  it('reads only the user\'s live captures with those ids, in the requested order', async () => {
    const { client, calls } = fakeClient([{ ...ROW, id: 6 }, ROW]);
    const captures = await getUserCapturesByIds(client, 'user-1', [5, 6]);

    expect(calls.from).toEqual(['captures']);
    expect(calls.eq).toEqual(['user_id', 'user-1']);
    expect(calls.in).toEqual(['id', [5, 6]]);
    expect(calls.is).toEqual(['deleted_at', null]);
    expect(captures.map(({ id }) => id)).toEqual([5, 6]);
    expect(captures[0]?.places[0]?.name).toBe('Padang Padang Beach');
  });

  it('throws database errors', async () => {
    const { client } = fakeClient([], new Error('db down'));
    await expect(getUserCapturesByIds(client, 'user-1', [5])).rejects.toThrow('db down');
  });
});

describe('createGuideModelCaller', () => {
  it('returns null without an API key', () => {
    expect(createGuideModelCaller(undefined)).toBeNull();
  });

  it('posts a JSON-only, no-thinking request and returns the text part', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"order": []}' }] } }] }),
        { status: 200 },
      )
    );
    const call = createGuideModelCaller('key-1', fetchImpl)!;

    await expect(call('프롬프트')).resolves.toBe('{"order": []}');
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${AI_MODEL_ENDPOINT}?key=key-1`);
    const body = JSON.parse(String(init.body));
    expect(body.contents[0].parts[0].text).toBe('프롬프트');
    expect(body.generationConfig).toMatchObject({
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 },
    });
  });

  it('throws on a failed response', async () => {
    const call = createGuideModelCaller('key-1', async () => new Response('no', { status: 429 }))!;
    await expect(call('x')).rejects.toThrow('429');
  });
});
