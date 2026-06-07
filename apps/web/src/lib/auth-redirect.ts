export const AUTH_SUCCESS_PATH = '/dashboard';

export function getAuthCallbackNextPath(nextParam: string | null): string {
  if (!nextParam) return AUTH_SUCCESS_PATH;
  if (!nextParam.startsWith('/') || nextParam.startsWith('//')) {
    return AUTH_SUCCESS_PATH;
  }
  return nextParam;
}

export function buildAuthCallbackRedirect(origin: string, nextPath = AUTH_SUCCESS_PATH): string {
  const url = new URL('/auth/callback', origin);
  url.searchParams.set('next', getAuthCallbackNextPath(nextPath));
  return url.toString();
}

export function buildRootAuthCallbackPath(pathname: string, search = ''): string | null {
  if (pathname !== '/') return null;
  const params = new URLSearchParams(search);
  if (!params.has('code')) return null;
  return `/auth/callback?${params.toString()}`;
}

export function buildLoginRedirectPath(pathname: string, search = ''): string {
  const nextPath = getAuthCallbackNextPath(`${pathname}${search}`);
  const params = new URLSearchParams({ next: nextPath });
  return `/login?${params.toString()}`;
}
