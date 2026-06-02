import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { serializeGuestCaptures, type GuestCapture } from '@scrave/shared';
import { migrateGuestCaptures } from '@/lib/migrate-guest-captures';

const STORAGE_KEY = 'scrave_guest_captures';

function guestCapture(id: number, title: string): GuestCapture {
  return {
    id,
    imageBase64: 'data:image/png;base64,iVBORw0KGgo=',
    title,
    summary: `${title} summary`,
    category: 'place',
    confidence: 0.9,
    tags: ['test'],
    places: [{ name: title }],
    createdAt: '2026-05-20T00:00:00.000Z',
  };
}

function createSupabaseStub(options: {
  uploadErrors?: boolean[];
  insertErrors?: boolean[];
  removeErrors?: boolean[];
}) {
  let uploadIndex = 0;
  let insertIndex = 0;
  let removeIndex = 0;
  const inserted: unknown[] = [];
  const removed: string[][] = [];

  const supabase = {
    storage: {
      from: () => ({
        upload: async () => {
          const hasError = options.uploadErrors?.[uploadIndex] ?? false;
          uploadIndex += 1;
          return { error: hasError ? new Error('upload failed') : null };
        },
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://storage.example.com/${path}` },
        }),
        remove: async (paths: string[]) => {
          removed.push(paths);
          const hasError = options.removeErrors?.[removeIndex] ?? false;
          removeIndex += 1;
          return { error: hasError ? new Error('remove failed') : null };
        },
      }),
    },
    from: () => ({
      insert: async (payload: unknown) => {
        inserted.push(payload);
        const hasError = options.insertErrors?.[insertIndex] ?? false;
        insertIndex += 1;
        return { error: hasError ? new Error('insert failed') : null };
      },
    }),
  } as unknown as SupabaseClient;

  return { supabase, inserted, removed };
}

describe('migrateGuestCaptures', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('keeps guest captures when migration upload fails', async () => {
    const captures = [guestCapture(-1, '실패 캡처')];
    sessionStorage.setItem(STORAGE_KEY, serializeGuestCaptures(captures));
    const { supabase } = createSupabaseStub({ uploadErrors: [true] });

    const migrated = await migrateGuestCaptures(supabase, 'user-1');

    expect(migrated).toBe(0);
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual(captures);
  });

  it('removes only successfully migrated captures and keeps failed ones', async () => {
    const success = guestCapture(-1, '성공 캡처');
    const failed = guestCapture(-2, '실패 캡처');
    sessionStorage.setItem(STORAGE_KEY, serializeGuestCaptures([success, failed]));
    const { supabase } = createSupabaseStub({ insertErrors: [false, true] });

    const migrated = await migrateGuestCaptures(supabase, 'user-1');

    expect(migrated).toBe(1);
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([failed]);
  });

  it('removes the uploaded image when migration insert fails', async () => {
    const failed = guestCapture(-1, '실패 캡처');
    sessionStorage.setItem(STORAGE_KEY, serializeGuestCaptures([failed]));
    const { supabase, removed } = createSupabaseStub({ insertErrors: [true] });

    const migrated = await migrateGuestCaptures(supabase, 'user-1');

    expect(migrated).toBe(0);
    expect(removed).toHaveLength(1);
    expect(removed[0][0]).toMatch(/^user-1\/.+\.jpg$/);
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([failed]);
  });

  it('keeps the original migration failure behavior when cleanup also fails', async () => {
    const failed = guestCapture(-1, '실패 캡처');
    sessionStorage.setItem(STORAGE_KEY, serializeGuestCaptures([failed]));
    const { supabase, removed } = createSupabaseStub({
      insertErrors: [true],
      removeErrors: [true],
    });

    const migrated = await migrateGuestCaptures(supabase, 'user-1');

    expect(migrated).toBe(0);
    expect(removed).toHaveLength(1);
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([failed]);
  });

  it('clears guest captures after every capture migrates successfully', async () => {
    const captures = [guestCapture(-1, '첫 번째'), guestCapture(-2, '두 번째')];
    sessionStorage.setItem(STORAGE_KEY, serializeGuestCaptures(captures));
    const { supabase } = createSupabaseStub({});

    const migrated = await migrateGuestCaptures(supabase, 'user-1');

    expect(migrated).toBe(2);
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
