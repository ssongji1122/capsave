import { describe, expect, it } from 'vitest';
import { getRealUserId, isRealAuthenticatedUser } from '@/lib/auth-user';

describe('auth user helpers', () => {
  it('treats null as unauthenticated', () => {
    expect(isRealAuthenticatedUser(null)).toBe(false);
    expect(getRealUserId(null)).toBeNull();
  });

  it('treats anonymous Supabase users as unauthenticated', () => {
    const user = { id: 'anon-user', is_anonymous: true };
    expect(isRealAuthenticatedUser(user)).toBe(false);
    expect(getRealUserId(user)).toBeNull();
  });

  it('treats non-anonymous users as authenticated', () => {
    const user = { id: 'real-user', is_anonymous: false };
    expect(isRealAuthenticatedUser(user)).toBe(true);
    expect(getRealUserId(user)).toBe('real-user');
  });

  it('treats legacy users without is_anonymous as authenticated when id exists', () => {
    const user = { id: 'legacy-user' };
    expect(isRealAuthenticatedUser(user)).toBe(true);
    expect(getRealUserId(user)).toBe('legacy-user');
  });
});
