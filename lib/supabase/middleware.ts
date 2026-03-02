import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Hàm cập nhật session và kiểm tra quyền truy cập (Onboarding/Auth)
 * Đã được tối ưu cho Vercel Edge Runtime
 */
export async function updateSession(request: NextRequest) {
    const { pathname } = request.nextUrl

    // 1. Cho phép Server Action đi qua mà không redirect (Tránh lỗi "Failed to fetch")
    if (
        request.headers.get('next-action') || 
        request.headers.get('Next-Action')
    ) {
        return NextResponse.next({ request })
    }

    // 2. Khởi tạo Response mặc định
    let supabaseResponse = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Kiểm tra biến môi trường (An toàn cho môi trường Edge)
    if (!supabaseUrl || !supabaseKey) {
        return supabaseResponse
    }

    // 3. Khởi tạo Supabase Client cho Middleware (Sử dụng chuẩn @supabase/ssr)
    const supabase = createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    // Cập nhật cookies vào Request cho các middleware/route sau đó
                    cookiesToSet.forEach(({ name, value }) => 
                        request.cookies.set(name, value)
                    )
                    // Tạo response mới để gắn cookies
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    // Cập nhật cookies vào Response trả về trình duyệt
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // 4. Lấy thông tin User hiện tại (Đây là phương thức an toàn nhất để xác thực ở Edge)
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // 5. Định nghĩa danh sách các Route
    const authPaths = ['/login', '/register']
    const isAuthPage = authPaths.some((p) => pathname === p)
    const isApiRoute = pathname.startsWith('/api/')
    const isOnboardingPage = pathname.startsWith('/onboarding')
    const isAuthCallback = pathname.startsWith('/auth/')

    // Các trang yêu cầu bảo vệ
    const protectedPaths = ['/', '/scan', '/log', '/profile', '/chat', '/fitness-plan']
    const isProtected = protectedPaths.some(
        (p) => pathname === p || pathname.startsWith(p + '/')
    )

    // --- LOGIC ĐIỀU HƯỚNG (REDIRECT LOGIC) ---

    // TH1: Chưa login mà cố tình vào trang bảo mật
    if (!user && isProtected) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        // Lưu lại trang đang định vào để sau khi login có thể redirect quay lại (tùy chọn)
        // url.searchParams.set('next', pathname) 
        return NextResponse.redirect(url)
    }

    // TH2: Đã login mà cố tình vào trang Login/Register
    if (user && isAuthPage) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    // TH3: Đã login -> Kiểm tra Onboarding (Bỏ qua cho API và Auth Callback)
    if (
        user && 
        !isOnboardingPage && 
        !isApiRoute && 
        !isAuthCallback &&
        (isProtected || isAuthPage) // Chỉ check khi ở các luồng chính
    ) {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', user.id)
            .single()

        // Nếu chưa hoàn thành onboarding (explicit check false)
        if (!error && profile && profile.onboarding_completed === false) {
            const url = request.nextUrl.clone()
            url.pathname = '/onboarding'
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}
