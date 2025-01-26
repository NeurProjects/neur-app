import { type NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Constants for configuration
const CONFIG = {
  PUBLIC_PAGES: [
    '/',           // Home page (Login)
    '/refresh',    // Token refresh page
    '/error',      // Error page
    '/maintenance' // Maintenance page
  ],
  PUBLIC_ASSETS: [
    '.svg',        // SVG images
    '.png',        // PNG images
    '.jpg',        // JPG images
    '.jpeg',       // JPEG images
    '.ico',        // Icon files
    '.webp',       // WebP images
    '.gif',        // GIF images
    '.css',        // CSS files
    '.js',         // JavaScript files
    '.json'        // JSON files
  ],
  AUTH_COOKIE: 'privy-token',
  SESSION_COOKIE: 'privy-session',
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000
} as const;

// Interface for authentication response
interface AuthResponse {
  success: boolean;
  error?: string;
  redirectUrl?: string;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except those starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (website icon)
     * - assets (public assets)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|assets).*)',
  ],
};

/**
 * Checks if a path is public
 * @param pathname The path to check
 * @returns boolean indicating if the path is public
 */
function isPublicPath(pathname: string): boolean {
  return CONFIG.PUBLIC_PAGES.includes(pathname) ||
         CONFIG.PUBLIC_ASSETS.some(ext => pathname.toLowerCase().endsWith(ext));
}

/**
 * Checks if the request is part of the Privy OAuth flow
 * @param searchParams URLSearchParams from the request
 * @returns boolean indicating if the request is part of OAuth flow
 */
function isPrivyOAuth(searchParams: URLSearchParams): boolean {
  return Boolean(
    searchParams.get('privy_oauth_code') ||
    searchParams.get('privy_oauth_state') ||
    searchParams.get('privy_oauth_provider')
  );
}

/**
 * Creates a redirect response with proper headers
 * @param url The URL to redirect to
 * @param currentPath The current path for redirect_uri
 * @returns NextResponse with redirect
 */
function createRedirectResponse(url: string, currentPath: string): NextResponse {
  const redirectUrl = new URL(url, process.env.NEXT_PUBLIC_APP_URL);
  redirectUrl.searchParams.set('redirect_uri', currentPath);
  
  return NextResponse.redirect(redirectUrl, {
    headers: {
      'Cache-Control': 'no-store, must-revalidate',
      'Pragma': 'no-cache'
    }
  });
}

/**
 * Handles authentication check and response
 * @param authToken The authentication token
 * @param sessionToken The session token
 * @param pathname Current path
 * @returns AuthResponse object
 */
function handleAuthentication(
  authToken: string | undefined,
  sessionToken: string | undefined,
  pathname: string
): AuthResponse {
  const definitelyAuthenticated = Boolean(authToken);
  const maybeAuthenticated = Boolean(sessionToken);

  if (!definitelyAuthenticated && maybeAuthenticated) {
    return {
      success: false,
      redirectUrl: '/refresh',
      error: 'Token refresh required'
    };
  }

  if (!definitelyAuthenticated && !maybeAuthenticated) {
    return {
      success: false,
      redirectUrl: '/',
      error: 'Authentication required'
    };
  }

  return { success: true };
}

/**
 * Main middleware function
 */
export async function middleware(req: NextRequest) {
  try {
    const { pathname } = req.nextUrl;
    
    // Skip middleware for public paths and OAuth flow
    if (isPublicPath(pathname) || isPrivyOAuth(req.nextUrl.searchParams)) {
      return NextResponse.next();
    }

    // Get authentication tokens
    const cookieAuthToken = req.cookies.get(CONFIG.AUTH_COOKIE)?.value;
    const cookieSession = req.cookies.get(CONFIG.SESSION_COOKIE)?.value;

    // Handle authentication
    const authResult = handleAuthentication(cookieAuthToken, cookieSession, pathname);

    if (!authResult.success) {
      console.warn(`Authentication failed: ${authResult.error}`);
      return createRedirectResponse(authResult.redirectUrl!, pathname);
    }

    // Add security headers
    const response = NextResponse.next();
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.redirect(new URL('/error', req.url));
  }
}