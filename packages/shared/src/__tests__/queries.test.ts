import { describe, it, expect, vi } from 'vitest';
import { getAllCaptures, getCapturesByCategory, searchCaptures, countUserCaptures, MAX_FREE_CAPTURES } from '../supabase/queries';

/** Minimal chainable Supabase query builder mock that records all method calls. */
function makeMockBuilder(finalResult: { data?: unknown[]; count?: number; error?: unknown } = {}) {
  const calls: string[] = [];
  const result = { data: [], count: 0, error: null, ...finalResult };

  const builder: Record<string, unknown> = {};
  const chainMethods = [
    'select', 'order', 'limit', 'lt', 'eq', 'or', 'range', 'is', 'update',
    'insert', 'upsert', 'delete', 'match',
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

function makeMockClient(builderResult?: { data?: unknown[]; count?: number; error?: unknown }) {
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
  it('filters out soft-deleted rows (deleted_at IS NULL)', async () => {
    const { client, calls } = makeMockClient({ count: 0 });
    await searchCaptures(client as never, 'test').catch(() => {});
    const isCall = calls.find((c) => c.startsWith('is('));
    expect(isCall, 'searchCaptures must call .is("deleted_at", null)').toBeTruthy();
    expect(isCall).toContain('"deleted_at"');
    expect(isCall).toContain('null');
  });
});

describe('MAX_FREE_CAPTURES', () => {
  it('is 10', () => {
    expect(MAX_FREE_CAPTURES).toBe(10);
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
