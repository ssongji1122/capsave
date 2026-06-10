import { describe, it, expect, vi } from 'vitest';
import {
  getAllCaptures,
  getCapturesByCategory,
  searchCaptures,
  getCaptureById,
  countUserCaptures,
  deleteCapture,
  saveCapture,
  updateCapturePlaces,
  reclassifyCapture,
  MAX_FREE_CAPTURES,
} from '../supabase/queries';

/** Minimal chainable Supabase query builder mock that records all method calls. */
function makeMockBuilder(finalResult: { data?: unknown; count?: number; error?: unknown } = {}) {
  const calls: string[] = [];
  const result = { data: [], count: 0, error: null, ...finalResult };

  const builder: Record<string, unknown> = {};
  const chainMethods = [
    'select', 'order', 'limit', 'lt', 'eq', 'or', 'range', 'is', 'update',
    'insert', 'upsert', 'delete', 'match', 'single',
  ];

  for (const method of chainMethods) {
    builder[method] = (...args: unknown[]) => {
      calls.push(`${method}(${args.map((a) => JSON.stringify(a)).join(', ')})`);
      return builder;
    };
  }

  builder.then = undefined;
  Object.defineProperty(builder, Symbol.toStringTag, { value: 'MockBuilder' });

  const promise = Promise.resolve(result);
  (builder as { then: unknown }).then = promise.then.bind(promise);
  (builder as { catch: unknown }).catch = promise.catch.bind(promise);

  return { builder, calls };
}

function makeMockClient(builderResult?: { data?: unknown; count?: number; error?: unknown }) {
  const { builder, calls } = makeMockBuilder(builderResult);
  const client = {
    from: () => builder,
  };
  return { client, calls };
}

function makeCountClient(resolveWith: { count: number | null; error: unknown }) {
  const qb = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    then: (resolve: (v: unknown) => void) => {
      resolve(resolveWith);
      return Promise.resolve(resolveWith);
    },
  };
  return { from: vi.fn().mockReturnValue(qb), _qb: qb };
}

// ---------------------------------------------------------------------------

describe('getAllCaptures', () => {
  it('filters out soft-deleted rows (deleted_at IS NULL)', async () => {
    const { client, calls } = makeMockClient();
    await getAllCaptures(client as never).catch(() => {});
    const isCall = calls.find((c) => c.startsWith('is('));
    expect(isCall, 'getAllCaptures must call .is("deleted_at", null)').toBeTruthy();
    expect(isCall).toContain('"deleted_at"');
    expect(isCall).toContain('null');
  });
});

describe('getCapturesByCategory', () => {
  it('filters out soft-deleted rows (deleted_at IS NULL)', async () => {
    const { client, calls } = makeMockClient();
    await getCapturesByCategory(client as never, 'place').catch(() => {});
    const isCall = calls.find((c) => c.startsWith('is('));
    expect(isCall, 'getCapturesByCategory must call .is("deleted_at", null)').toBeTruthy();
    expect(isCall).toContain('"deleted_at"');
    expect(isCall).toContain('null');
  });
});

describe('searchCaptures', () => {
  function makeRpcClient(resolveWith: { data: unknown[] | null; error: unknown }) {
    const rpc = vi.fn().mockResolvedValue(resolveWith);
    return { client: { rpc } as unknown, rpc };
  }

  it('returns an empty result without calling the RPC when query is whitespace', async () => {
    const { client, rpc } = makeRpcClient({ data: [], error: null });
    const result = await searchCaptures(client as never, '   ');
    expect(rpc).not.toHaveBeenCalled();
    expect(result).toEqual({ items: [], total: 0 });
  });

  it('invokes the search_user_captures RPC with trimmed query and default paging', async () => {
    const { client, rpc } = makeRpcClient({ data: [], error: null });
    await searchCaptures(client as never, '  강남  ');
    expect(rpc).toHaveBeenCalledWith('search_user_captures', {
      search_query: '강남',
      search_limit: 20,
      search_offset: 0,
    });
  });

  it('passes custom limit and offset through to the RPC', async () => {
    const { client, rpc } = makeRpcClient({ data: [], error: null });
    await searchCaptures(client as never, 'a', { limit: 5, offset: 10 });
    expect(rpc).toHaveBeenCalledWith('search_user_captures', {
      search_query: 'a',
      search_limit: 5,
      search_offset: 10,
    });
  });

  it('throws when the RPC returns an error', async () => {
    const err = new Error('rpc failed');
    const { client } = makeRpcClient({ data: null, error: err });
    await expect(searchCaptures(client as never, 'x')).rejects.toThrow('rpc failed');
  });
});

describe('getCaptureById', () => {
  it('filters out soft-deleted rows (deleted_at IS NULL)', async () => {
    const { client, calls } = makeMockClient();
    await getCaptureById(client as never, 123).catch(() => {});
    const isCall = calls.find((c) => c.startsWith('is('));
    expect(isCall, 'getCaptureById must call .is("deleted_at", null)').toBeTruthy();
    expect(isCall).toContain('"deleted_at"');
    expect(isCall).toContain('null');
  });
});

describe('deleteCapture', () => {
  it('soft-deletes by setting deleted_at instead of deleting the row', async () => {
    const { client, calls } = makeMockClient();
    await deleteCapture(client as never, 123);

    const updateCall = calls.find((c) => c.startsWith('update('));
    expect(updateCall, 'deleteCapture must update deleted_at').toBeTruthy();
    expect(updateCall).toContain('"deleted_at"');
    expect(calls.some((c) => c.startsWith('delete('))).toBe(false);

    const eqCall = calls.find((c) => c.startsWith('eq('));
    expect(eqCall).toContain('"id"');
    expect(eqCall).toContain('123');
  });
});

describe('saveCapture', () => {
  it('filters unsafe links before inserting a capture row', async () => {
    const { client, calls } = makeMockClient({
      data: {
        id: 1,
        category: 'text',
        title: '링크 캡처',
        summary: '',
        places: [],
        extracted_text: '',
        links: ['https://safe.example/article'],
        tags: [],
        source: 'other',
        image_url: 'user-1/capture.jpg',
        created_at: '2026-05-20T00:00:00Z',
        user_id: 'user-1',
        confidence: 0.8,
        reclassified_at: null,
        deleted_at: null,
        source_account_id: null,
      },
    });

    await saveCapture(client as never, {
      category: 'text',
      title: '링크 캡처',
      summary: '',
      places: [
        {
          name: '카페',
          links: ['https://safe.example/place', 'javascript:alert(1)'],
        },
      ],
      extractedText: '',
      links: ['https://safe.example/article', 'javascript:alert(1)'],
      tags: [],
      source: 'other',
      confidence: 0.8,
      sourceAccountId: null,
    }, 'user-1/capture.jpg', 'user-1');

    const insertCall = calls.find((c) => c.startsWith('insert('));
    expect(insertCall).toContain('https://safe.example/article');
    expect(insertCall).toContain('https://safe.example/place');
    expect(insertCall).not.toContain('javascript:alert');
  });
});

describe('updateCapturePlaces', () => {
  it('does not update soft-deleted rows', async () => {
    const { client, calls } = makeMockClient();
    await updateCapturePlaces(client as never, 123, [{ name: '장소' }]).catch(() => {});

    const isCall = calls.find((c) => c.startsWith('is('));
    expect(isCall, 'updateCapturePlaces must call .is("deleted_at", null)').toBeTruthy();
    expect(isCall).toContain('"deleted_at"');
    expect(isCall).toContain('null');
  });
});

describe('reclassifyCapture', () => {
  it('does not reclassify soft-deleted rows', async () => {
    const { client, calls } = makeMockClient();
    await reclassifyCapture(client as never, 123, 'place', [{ name: '장소' }]).catch(() => {});

    const isCall = calls.find((c) => c.startsWith('is('));
    expect(isCall, 'reclassifyCapture must call .is("deleted_at", null)').toBeTruthy();
    expect(isCall).toContain('"deleted_at"');
    expect(isCall).toContain('null');
  });
});

describe('MAX_FREE_CAPTURES', () => {
  it('is 100', () => {
    expect(MAX_FREE_CAPTURES).toBe(100);
  });
});

describe('countUserCaptures', () => {
  it('returns the count of non-deleted captures for the user', async () => {
    const { _qb: qb, ...client } = makeCountClient({ count: 7, error: null });
    const result = await countUserCaptures(client as never, 'user-abc');
    expect(result).toBe(7);
    expect(qb.eq).toHaveBeenCalledWith('user_id', 'user-abc');
    expect(qb.is).toHaveBeenCalledWith('deleted_at', null);
  });

  it('returns 0 when count is null', async () => {
    const { ...client } = makeCountClient({ count: null, error: null });
    const result = await countUserCaptures(client as never, 'user-xyz');
    expect(result).toBe(0);
  });

  it('throws when supabase returns an error', async () => {
    const { ...client } = makeCountClient({ count: null, error: new Error('db error') });
    await expect(countUserCaptures(client as never, 'user-err')).rejects.toThrow();
  });
});
