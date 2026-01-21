import { authMiddleware } from '@clerk/nextjs';

export default authMiddleware({
  // Public routes that don't require authentication
  publicRoutes: [
    '/',
    '/login',
    '/signup',
    '/invite/accept',
    '/api/webhooks/(.*)',
    '/api/saml/metadata/(.*)',
    '/api/saml/acs',
    '/api/saml/login/(.*)',
  ],
  // Routes that should be completely ignored by the middleware
  ignoredRoutes: [
    '/_next/(.*)',
    '/favicon.ico',
    '/api/health',
  ],
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
