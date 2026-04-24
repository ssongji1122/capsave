import { NextResponse, type NextRequest } from 'next/server';

// Edge-compatible route guard (no external deps)
const PROTECTED: string[] = [];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // API routes: pass through
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Check auth via cookie presence (Supabase sets sb-*-auth-token)
  const hasCookie = request.cookies
    .getAll()
    .some((c) => c.name.includes('auth-token') || c.name.startsWith('sb-'));

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));

  if (isProtected && !hasCookie) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
