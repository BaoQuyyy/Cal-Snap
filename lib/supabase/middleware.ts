import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function getSafeUrl(): string {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    try {
        new URL(url)
        return url
    } catch {
        return 'https://placeholder.supabase.co'
    }
}

function isConfigured(): boolean {
    try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
        new URL(url)
        return key.length > 20 && !url.includes('placeholder')
    } catch {
        return false
    }
}

export async function updateSession(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Let Server Action requests through without redirects (avoids "Failed to fetch")
    if (request.headers.get('next-action') || request.headers.get('Next-Action')) {
        return NextResponse.next({ request })
    }

    if (!isConfigured()) {
        const authPaths = ['/login', '/register']
        const isAuthPage = authPaths.some((p) => pathname === p)
        if (isAuthPage || pathname.startsWith('/api/')) {
            return NextResponse.next({ request })
        }
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        getSafeUrl(),
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const protectedPaths = ['/', '/scan', '/log', '/profile']
    const isProtected = protectedPaths.some(
        (p) => pathname === p || pathname.startsWith(p + '/')
    )

    if (!user && isProtected) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    if (user && (pathname === '/login' || pathname === '/register')) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
