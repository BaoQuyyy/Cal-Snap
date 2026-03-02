import { NextResponse, type NextRequest } from 'next/server'

function hasSupabaseSessionCookie(request: NextRequest): boolean {
    const cookies = request.cookies.getAll()

    // Supabase v2 cookie name pattern: sb-<project-ref>-auth-token
    return cookies.some(
        (cookie) =>
            cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')
    )
}

const protectedPaths = ['/', '/scan', '/log', '/profile', '/chat', '/fitness-plan']
const authPaths = ['/login', '/register']

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Let Server Action requests through without redirects (avoids "Failed to fetch")
    if (request.headers.get('next-action') || request.headers.get('Next-Action')) {
        return NextResponse.next()
    }

    const isProtected = protectedPaths.some(
        (p) => pathname === p || pathname.startsWith(p + '/')
    )
    const isAuthPage = authPaths.some((p) => pathname === p)
    const hasSession = hasSupabaseSessionCookie(request)

    // Chưa login mà vào trang protected → redirect login
    if (!hasSession && isProtected) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Đã login mà vào login/register → redirect về home
    if (hasSession && isAuthPage) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - api routes (they handle their own auth)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
