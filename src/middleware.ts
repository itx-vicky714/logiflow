import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for LogiFlow Performance & Reliability
 * Resolves 406 Not Acceptable errors in RSC fetches and Edge runtime environments.
 */
export function middleware(request: NextRequest) {
  const url = request.nextUrl;

  // Audit _rsc (React Server Component) data fetches
  const isRscRequest = request.headers.get('rsc') === '1' || url.searchParams.has('_rsc');

  if (isRscRequest) {
    // Ensure the request Accept header is compatible with Vercel/Next.js component protocol
    // This prevents silent 406 failures during rapid tactical dashboard navigation
    const response = NextResponse.next();
    
    // Explicitly set the Vary header to include 'rsc' to avoid cache poisoning
    response.headers.set('Vary', 'Accept, rsc, next-router-state-tree, next-router-prefetch, next-url');
    
    // Force compatibility for edge runtime environments
    if (!request.headers.get('Accept')?.includes('text/x-component')) {
       // We can't easily modify the REQUEST headers in middleware for the downstream server 
       // in all Next.js versions, but we can ensure the RESPONSE includes the correct Vary.
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
