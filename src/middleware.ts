import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnAdminPage = req.nextUrl.pathname.startsWith('/config');
  const isOnLoginPage = req.nextUrl.pathname.startsWith('/auth/signin');
  const isOnAuthCallback = req.nextUrl.pathname.startsWith('/api/auth');

  // Allow auth callbacks to proceed
  if (isOnAuthCallback) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users trying to access admin pages
  if (isOnAdminPage && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(
      new URL(`/auth/signin?callbackUrl=${callbackUrl}`, req.url)
    );
  }

  // Redirect authenticated users away from login page
  if (isLoggedIn && isOnLoginPage) {
    return NextResponse.redirect(new URL('/config', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
