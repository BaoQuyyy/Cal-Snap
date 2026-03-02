import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Cho phép Server Actions đi qua
  if (
    request.headers.get('next-action') ||
    request.headers.get('Next-Action')
  ) {
    return NextResponse.next({ request })
  }

  // 2. Tạo response mặc định
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Nếu thiếu env → không crash Edge
  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse
  }

  // 3. Khởi tạo Supabase SSR client (Edge-safe)
  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
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

  // 4. Lấy user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 5. Route definitions
  const authPaths = ['/login', '/register']
  const protectedPaths = ['/', '/scan', '/log', '/profile', '/chat', '/fitness-plan']

  const isAuthPage = authPaths.includes(pathname)
  const isProtected = protectedPaths.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
  const isApiRoute = pathname.startsWith('/api/')
  const isOnboardingPage = pathname.startsWith('/onboarding')
  const isAuthCallback = pathname.startsWith('/auth/')

  // --- REDIRECT LOGIC ---

  // TH1: Chưa login mà vào protected
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // TH2: Đã login mà vào login/register
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // TH3: Đã login → check onboarding
  if (
    user &&
    !isOnboardingPage &&
    !isApiRoute &&
    !isAuthCallback
  ) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .maybeSingle()

    if (profile && profile.onboarding_completed === false) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
