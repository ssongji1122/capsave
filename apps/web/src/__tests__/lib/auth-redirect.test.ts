import { describe, expect, it } from 'vitest';
import {
  AUTH_SUCCESS_PATH,
  buildAuthCallbackRedirect,
  buildLoginRedirectPath,
  getAuthCallbackNextPath,
} from '@/lib/auth-redirect';

describe('auth redirect helpers', () => {
  it('uses dashboard as the default successful auth destination', () => {
    expect(AUTH_SUCCESS_PATH).toBe('/dashboard');
    expect(getAuthCallbackNextPath(null)).toBe('/dashboard');
  });

  it('builds an auth callback URL with the next path encoded', () => {
    expect(buildAuthCallbackRedirect('https://scrave.app', '/dashboard')).toBe(
      'https://scrave.app/auth/callback?next=%2Fdashboard',
    );
  });

  it('preserves the intended protected route in login redirects', () => {
    expect(buildLoginRedirectPath('/map', '?view=places')).toBe(
      '/login?next=%2Fmap%3Fview%3Dplaces',
    );
  });

  it('allows internal next paths with query strings', () => {
    expect(getAuthCallbackNextPath('/map?view=places')).toBe('/map?view=places');
  });

  it('rejects external next URLs and falls back to dashboard', () => {
    expect(getAuthCallbackNextPath('https://evil.example/phish')).toBe('/dashboard');
  });

  it('rejects protocol-relative next URLs and falls back to dashboard', () => {
    expect(getAuthCallbackNextPath('//evil.example/phish')).toBe('/dashboard');
  });
});
