import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  });

  // Paths that require admin privileges
  const adminPaths = ['/admin'];
  
  // Check if the current path is an admin path
  const isAdminPath = adminPaths.some(path => request.nextUrl.pathname.startsWith(path));
  
  // Check if accessing root path
  const isRootPath = request.nextUrl.pathname === '/';
  
  // If trying to access root path but not authenticated, redirect to login
  if (isRootPath && !token) {
    const url = new URL('/login', request.url);
    return NextResponse.redirect(url);
  }
  
  // If trying to access admin routes but not authenticated, redirect to login
  if (isAdminPath && !token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  
  // If trying to access admin routes but not an admin, redirect to home
  if (isAdminPath && token && !token.isAdmin) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  return NextResponse.next();
}

// Updated matcher to include the root path
export const config = {
  matcher: ['/', '/admin/:path*'],
};