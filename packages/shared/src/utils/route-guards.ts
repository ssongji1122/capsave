const PUBLIC_PREFIXES = ['/login', '/auth', '/api'];

export function isPublicRoute(pathname: string): boolean {
  if (pathname === '/') return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function shouldRedirectToDashboard(pathname: string, hasUser: boolean): boolean {
  return pathname === '/' && hasUser;
}

export function shouldRedirectToLogin(pathname: string, hasUser: boolean): boolean {
  if (hasUser) return false;
  return !isPublicRoute(pathname);
}
