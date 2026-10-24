// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  expireStoredCoordinates: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));
vi.mock('@/lib/expire-coordinates', () => ({ expireStoredCoordinates: mocks.expireStoredCoordinates }));

const SERVICE_CLIENT = { from: vi.fn() };

function cronRequest(token?: string) {
  return new NextRequest('http://localhost/api/cron/expire-coordinates', {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

describe('GET /api/cron/expire-coordinates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'cron-secret';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    mocks.createClient.mockReturnValue(SERVICE_CLIENT);
    mocks.expireStoredCoordinates.mockResolvedValue({ scanned: 12, updated: 3 });
  });

  it('rejects requests without the cron secret', async () => {
    const { GET } = await import('@/app/api/cron/expire-coordinates/route');

    expect((await GET(cronRequest())).status).toBe(401);
    expect((await GET(cronRequest('wrong'))).status).toBe(401);
    expect(mocks.expireStoredCoordinates).not.toHaveBeenCalled();
  });

  it('rejects every request when no cron secret is configured', async () => {
    delete process.env.CRON_SECRET;
    const { GET } = await import('@/app/api/cron/expire-coordinates/route');

    expect((await GET(cronRequest('undefined'))).status).toBe(401);
    expect(mocks.expireStoredCoordinates).not.toHaveBeenCalled();
  });

  it('expires stored coordinates with the service role client', async () => {
    const { GET } = await import('@/app/api/cron/expire-coordinates/route');
    const response = await GET(cronRequest('cron-secret'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ scanned: 12, updated: 3 });
    expect(mocks.createClient).toHaveBeenCalledWith('https://example.supabase.co', 'service-role');
    expect(mocks.expireStoredCoordinates).toHaveBeenCalledWith(SERVICE_CLIENT, expect.any(Date));
  });

  it('returns 500 when the cleanup fails', async () => {
    mocks.expireStoredCoordinates.mockRejectedValue(new Error('db down'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { GET } = await import('@/app/api/cron/expire-coordinates/route');

    expect((await GET(cronRequest('cron-secret'))).status).toBe(500);
    error.mockRestore();
  });
});
