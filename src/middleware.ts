import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth')
    const isAdminPage = req.nextUrl.pathname.startsWith('/admin')
    const isPortalPage = req.nextUrl.pathname.startsWith('/portal')
    const isApiRoute = req.nextUrl.pathname.startsWith('/api')

    // Allow API routes to pass through (they handle their own auth)
    if (isApiRoute) {
      return NextResponse.next()
    }

    // Redirect to signin if not authenticated and trying to access protected routes
    if (!isAuth && (isAdminPage || isPortalPage)) {
      return NextResponse.redirect(new URL('/auth/signin', req.url))
    }

    // Redirect authenticated users away from auth pages
    if (isAuth && isAuthPage) {
      if (token.role === 'CUSTOMER_PORTAL') {
        return NextResponse.redirect(new URL('/portal', req.url))
      } else {
        return NextResponse.redirect(new URL('/admin', req.url))
      }
    }

    // Role-based access control
    if (isAuth && token.role) {
      // Admin routes - only allow ADMIN, TECH, STAFF
      if (isAdminPage && !['ADMIN', 'TECH', 'STAFF'].includes(token.role)) {
        return NextResponse.redirect(new URL('/portal', req.url))
      }

      // Portal routes - only allow CUSTOMER_PORTAL
      if (isPortalPage && token.role !== 'CUSTOMER_PORTAL') {
        return NextResponse.redirect(new URL('/admin', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to public pages and API routes
        if (
          req.nextUrl.pathname === '/' ||
          req.nextUrl.pathname.startsWith('/auth') ||
          req.nextUrl.pathname.startsWith('/api/webhooks') ||
          req.nextUrl.pathname.startsWith('/_next')
        ) {
          return true
        }

        // Require authentication for all other routes
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/((?!api/webhooks|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
