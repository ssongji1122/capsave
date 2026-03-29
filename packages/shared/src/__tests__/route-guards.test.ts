import { describe, it, expect } from 'vitest';
import { isPublicRoute, shouldRedirectToDashboard, shouldRedirectToLogin } from '../utils/route-guards';

describe('isPublicRoute', () => {
  it('returns true for landing page /', () => {
    expect(isPublicRoute('/')).toBe(true);
  });

  it('returns true for /login', () => {
    expect(isPublicRoute('/login')).toBe(true);
  });

  it('returns true for /auth/callback', () => {
    expect(isPublicRoute('/auth/callback')).toBe(true);
  });

  it('returns true for /api routes', () => {
    expect(isPublicRoute('/api/analyze')).toBe(true);
    expect(isPublicRoute('/api/upload')).toBe(true);
    expect(isPublicRoute('/api/cron/dau')).toBe(true);
  });

  it('returns false for /dashboard', () => {
    expect(isPublicRoute('/dashboard')).toBe(false);
  });

  it('returns true for /places (guest-accessible)', () => {
    expect(isPublicRoute('/places')).toBe(true);
  });

  it('returns true for /texts (guest-accessible)', () => {
    expect(isPublicRoute('/texts')).toBe(true);
  });

  it('returns false for /settings', () => {
    expect(isPublicRoute('/settings')).toBe(false);
  });

  it('returns true for /map (guest-accessible for demo)', () => {
    expect(isPublicRoute('/map')).toBe(true);
  });
});

describe('shouldRedirectToDashboard', () => {
  it('returns true when authenticated user visits /', () => {
    expect(shouldRedirectToDashboard('/', true)).toBe(true);
  });

  it('returns false when unauthenticated user visits /', () => {
    expect(shouldRedirectToDashboard('/', false)).toBe(false);
  });

  it('returns false when authenticated user visits /dashboard', () => {
    expect(shouldRedirectToDashboard('/dashboard', true)).toBe(false);
  });

  it('returns false when authenticated user visits /login', () => {
    expect(shouldRedirectToDashboard('/login', true)).toBe(false);
  });
});

describe('shouldRedirectToLogin', () => {
  it('returns true when unauthenticated user visits /dashboard', () => {
    expect(shouldRedirectToLogin('/dashboard', false)).toBe(true);
  });

  it('returns true when unauthenticated user visits /settings', () => {
    expect(shouldRedirectToLogin('/settings', false)).toBe(true);
  });

  it('returns false when authenticated user visits /dashboard', () => {
    expect(shouldRedirectToLogin('/dashboard', true)).toBe(false);
  });

  it('returns false when unauthenticated user visits /', () => {
    expect(shouldRedirectToLogin('/', false)).toBe(false);
  });

  it('returns false when unauthenticated user visits /login', () => {
    expect(shouldRedirectToLogin('/login', false)).toBe(false);
  });

  it('returns false when unauthenticated user visits /api/*', () => {
    expect(shouldRedirectToLogin('/api/analyze', false)).toBe(false);
  });
});
