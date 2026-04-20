import { describe, it, expect, vi } from 'vitest';
import { getAllCaptures, getCapturesByCategory, searchCaptures } from '../supabase/queries';

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

  // Terminal methods return a Promise of the result
  builder.then = undefined; // not a thenable itself
  Object.defineProperty(builder, Symbol.toStringTag, { value: 'MockBuilder' });

  // Make it awaitable as a plain value by adding a custom await mechanism
  // We simulate the Supabase pattern where the builder is also a Promise:
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

// ---------------------------------------------------------------------------

describe('getAllCaptures', () => {
  it('filters out soft-deleted rows (deleted_at IS NULL)', async () => {
    const { client, calls } = makeMockClient();
    await getAllCaptures(client as never).catch(() => {}); // ignore result, just track calls
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
