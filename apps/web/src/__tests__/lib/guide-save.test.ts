import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MAX_FREE_CAPTURES } from '@scrave/shared';
import {
  buildGuideCaptureAnalysis,
  getGuideCaptureImageUrl,
  getGuideCaptureTag,
  getGuideSaveLoginPath,
  saveGuideToArchive,
} from '@/lib/guide-save';
import { ULUWATU_CAPTURE_GUIDE } from '@/lib/public-guides';

const USER_ID = 'user-1';

function fakeClient({
  existing = [] as { id: number }[],
  count = 0,
} = {}) {
  const calls: { inserted: Record<string, unknown> | null; contains: unknown[] | null } = {
    inserted: null,
    contains: null,
  };

  const client = {
    from() {
      let mode: 'select' | 'count' | 'insert' = 'select';
      const builder = {
        select(_columns?: string, options?: { head?: boolean }) {
          if (options?.head) mode = 'count';
          return builder;
        },
        eq() {
          return builder;
        },
        is() {
          return builder;
        },
        contains(column: string, value: unknown) {
          calls.contains = [column, value];
          return builder;
        },
        limit() {
          return builder;
        },
        insert(row: Record<string, unknown>) {
          mode = 'insert';
          calls.inserted = row;
          return builder;
        },
        single() {
          return Promise.resolve({
            data: { ...calls.inserted, id: 77, created_at: '2026-09-26T00:00:00Z' },
            error: null,
          });
        },
        then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
          const result =
            mode === 'count' ? { count, error: null } : { data: existing, error: null };
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return builder;
    },
  };

  return { client: client as unknown as SupabaseClient, calls };
}

describe('buildGuideCaptureAnalysis', () => {
  const analysis = buildGuideCaptureAnalysis(ULUWATU_CAPTURE_GUIDE);

  it('turns a guide into one place capture with every coordinate', () => {
    expect(analysis.category).toBe('place');
    expect(analysis.title).toBe(ULUWATU_CAPTURE_GUIDE.title);
    expect(analysis.places).toHaveLength(ULUWATU_CAPTURE_GUIDE.places.length);

    ULUWATU_CAPTURE_GUIDE.places.forEach((place, index) => {
      expect(analysis.places[index]).toMatchObject({
        name: place.localName,
        address: place.address,
        lat: place.coordinates.latitude,
        lng: place.coordinates.longitude,
      });
    });
  });

  it('keeps the Google Maps link and the official page on every place', () => {
    for (const place of analysis.places) {
      expect(place.links?.[0]).toContain('google.com/maps');
      expect(place.links?.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('tags the capture with its guide so it is saved only once', () => {
    expect(analysis.tags).toContain(getGuideCaptureTag(ULUWATU_CAPTURE_GUIDE.slug));
    expect(analysis.confidence).toBe(1);
  });
});

describe('guide save paths', () => {
  it('uses the guide share image as the capture image', () => {
    expect(getGuideCaptureImageUrl(ULUWATU_CAPTURE_GUIDE)).toBe(
      'https://scrave.vercel.app/g/uluwatu-cliff-captures/opengraph-image'
    );
  });

  it('comes back to the guide and saves after login', () => {
    expect(getGuideSaveLoginPath('uluwatu-cliff-captures')).toBe(
      '/login?next=%2Fg%2Fuluwatu-cliff-captures%3Fsave%3D1'
    );
  });
});

describe('saveGuideToArchive', () => {
  it('returns the existing capture instead of saving twice', async () => {
    const { client, calls } = fakeClient({ existing: [{ id: 12 }] });

    await expect(saveGuideToArchive(client, ULUWATU_CAPTURE_GUIDE, USER_ID)).resolves.toEqual({
      status: 'already',
      captureId: 12,
    });
    expect(calls.contains).toEqual(['tags', [getGuideCaptureTag(ULUWATU_CAPTURE_GUIDE.slug)]]);
    expect(calls.inserted).toBeNull();
  });

  it('stops at the free plan limit', async () => {
    const { client, calls } = fakeClient({ count: MAX_FREE_CAPTURES });

    await expect(saveGuideToArchive(client, ULUWATU_CAPTURE_GUIDE, USER_ID)).resolves.toEqual({
      status: 'limit',
    });
    expect(calls.inserted).toBeNull();
  });

  it('saves the guide as the user’s place capture', async () => {
    const { client, calls } = fakeClient({ count: 3 });

    await expect(saveGuideToArchive(client, ULUWATU_CAPTURE_GUIDE, USER_ID)).resolves.toEqual({
      status: 'saved',
      captureId: 77,
    });
    expect(calls.inserted).toMatchObject({
      category: 'place',
      user_id: USER_ID,
      image_url: getGuideCaptureImageUrl(ULUWATU_CAPTURE_GUIDE),
    });
  });
});

describe('saving a guide draft made from captures', () => {
  const draft = {
    ...ULUWATU_CAPTURE_GUIDE,
    slug: 'my-guide-abcdefghij',
    status: 'draft' as const,
  };

  it('does not link to a guide page that does not exist yet', () => {
    const analysis = buildGuideCaptureAnalysis(draft);
    expect(analysis.links).toEqual([]);
    expect(analysis.tags).toEqual([getGuideCaptureTag(draft.slug)]);
  });

  it('uses the given cover image instead of the share image', async () => {
    const { client, calls } = fakeClient({ count: 3 });

    await saveGuideToArchive(client, draft, USER_ID, { imageUrl: 'captures/user-1/5.jpg' });
    expect(calls.inserted).toMatchObject({ image_url: 'captures/user-1/5.jpg' });
  });
});
