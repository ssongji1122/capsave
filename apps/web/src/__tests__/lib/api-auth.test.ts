// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  bearerClient: {
    auth: {
      getUser: vi.fn(),
    },
  },
  cookieClient: {
    auth: {
      getUser: vi.fn(),
    },
  },
  createSupabaseClient: vi.fn(),
  createServerClient: vi.fn(),
  touchUserSeen: vi.fn(),
}));

vi.mock('@scrave/shared', () => ({
  createSupabaseClient: mocks.createSupabaseClient,
  extractBearerToken: (header: string | null) => {
    if (!header?.startsWith('Bearer ')) return null;
    return header.slice('Bearer '.length);
  },
  touchUserSeen: mocks.touchUserSeen,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createServerClient,
}));

function requestWithBearer(token: string) {
  return new NextRequest('http://localhost/api/analyze', {
    headers: { authorization: `Bearer ${token}` },
  });
}

function requestWithoutBearer() {
  return new NextRequest('http://localhost/api/analyze');
}

describe('getAuthUserAndTouch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSupabaseClient.mockReturnValue(mocks.bearerClient);
    mocks.createServerClient.mockResolvedValue(mocks.cookieClient);
  });

  it('returns null and does not touch activity for anonymous bearer users', async () => {
    mocks.bearerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'anon-user', is_anonymous: true } },
    });

    const { getAuthUserAndTouch } = await import('@/lib/api-auth');
    const user = await getAuthUserAndTouch(requestWithBearer('anon-token'));

    expect(user).toBeNull();
    expect(mocks.touchUserSeen).not.toHaveBeenCalled();
  });

  it('returns and touches activity for real bearer users', async () => {
    const realUser = { id: 'real-user', is_anonymous: false };
    mocks.bearerClient.auth.getUser.mockResolvedValue({
      data: { user: realUser },
    });

    const { getAuthUserAndTouch } = await import('@/lib/api-auth');
    const user = await getAuthUserAndTouch(requestWithBearer('real-token'));

    expect(user).toBe(realUser);
    expect(mocks.touchUserSeen).toHaveBeenCalledWith(mocks.bearerClient, 'real-user');
  });

  it('returns null and does not touch activity for anonymous cookie users', async () => {
    mocks.cookieClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'anon-cookie-user', is_anonymous: true } },
    });

    const { getAuthUserAndTouch } = await import('@/lib/api-auth');
    const user = await getAuthUserAndTouch(requestWithoutBearer());

    expect(user).toBeNull();
    expect(mocks.touchUserSeen).not.toHaveBeenCalled();
  });
});
