import { describe, expect, it, vi } from 'vitest';
import type { PlaceInfo } from '@scrave/shared';
import { expireStoredCoordinates } from '@/lib/expire-coordinates';

const NOW = new Date('2026-10-24T00:00:00.000Z');
const OLD = '2026-09-01T00:00:00.000Z';
const RECENT = '2026-10-20T00:00:00.000Z';

type Row = { id: number; places: PlaceInfo[] };

function fakeClient(rows: Row[]) {
  const updates: Array<{ id: number; places: PlaceInfo[] }> = [];
  const ranges: Array<[number, number]> = [];

  const client = {
    from: vi.fn(() => ({
      select: () => ({
        order: () => ({
          range: async (from: number, to: number) => {
            ranges.push([from, to]);
            return { data: rows.slice(from, to + 1), error: null };
          },
        }),
      }),
      update: (values: { places: PlaceInfo[] }) => ({
        eq: async (_column: string, id: number) => {
          updates.push({ id, places: values.places });
          return { error: null };
        },
      }),
    })),
  };

  return { client, updates, ranges };
}

describe('expireStoredCoordinates', () => {
  it('strips geocoded coordinates older than 30 days and writes only changed captures', async () => {
    const { client, updates } = fakeClient([
      { id: 1, places: [{ name: '오래됨', lat: 37.5, lng: 127, placeId: 'ChIJ-old', geocodedAt: OLD }] },
      { id: 2, places: [{ name: '최근', lat: 37.6, lng: 127.1, geocodedAt: RECENT }] },
      { id: 3, places: [{ name: '가이드 장소', lat: 37.7, lng: 127.2 }] },
    ]);

    const result = await expireStoredCoordinates(client as never, NOW);

    expect(result).toEqual({ scanned: 3, updated: 1 });
    expect(updates).toEqual([{ id: 1, places: [{ name: '오래됨', placeId: 'ChIJ-old' }] }]);
  });

  it('reads every page of captures', async () => {
    const rows: Row[] = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      places: [{ name: `장소 ${i + 1}`, lat: 37, lng: 127, geocodedAt: OLD }],
    }));
    const { client, updates, ranges } = fakeClient(rows);

    const result = await expireStoredCoordinates(client as never, NOW, 2);

    expect(ranges).toEqual([[0, 1], [2, 3], [4, 5]]);
    expect(result).toEqual({ scanned: 5, updated: 5 });
    expect(updates.map((u) => u.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it('treats a missing places value as empty', async () => {
    const { client, updates } = fakeClient([{ id: 1, places: null as unknown as PlaceInfo[] }]);

    await expect(expireStoredCoordinates(client as never, NOW)).resolves.toEqual({ scanned: 1, updated: 0 });
    expect(updates).toEqual([]);
  });
});
