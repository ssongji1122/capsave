import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { buildLoginRedirectPath } from '@/lib/auth-redirect';
import { isRealAuthenticatedUser } from '@/lib/auth-user';

const PROTECTED = ['/dashboard', '/places', '/texts', '/map', '/settings'] as const;

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // API routes: pass through
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));

  if (!isProtected) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!isRealAuthenticatedUser(user)) {
    return NextResponse.redirect(new URL(
      buildLoginRedirectPath(pathname, request.nextUrl.search),
      request.url
    ));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
