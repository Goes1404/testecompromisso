import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Evita carregar o supabase client em recursos estáticos para performance
  if (request.nextUrl.pathname.startsWith('/_next') || request.nextUrl.pathname.includes('.')) {
      return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // Proteger rotas /dashboard originando flash of content
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      return NextResponse.redirect(redirectUrl)
    }

    // REDIRECIONAMENTO PARA PRIMEIRO ACESSO (MUDANÇA DE SENHA FORÇADA)
    const mustChangePassword = session.user.user_metadata?.must_change_password;
    const isFirstAccessPage = request.nextUrl.pathname === '/dashboard/first-access';

    if (mustChangePassword && !isFirstAccessPage) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard/first-access'
      return NextResponse.redirect(redirectUrl)
    }
    
    if (!mustChangePassword && isFirstAccessPage) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/dashboard/home'
        return NextResponse.redirect(redirectUrl)
    }
  }

  // Redirecionar usuários logados para fora do login
  if (request.nextUrl.pathname === '/login' && session) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard/home'
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}
