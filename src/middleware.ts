import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Propagate or generate a correlation ID so every log entry for the same
  // request can be joined in any log aggregator (Datadog, Axiom, etc.)
  const requestId =
    request.headers.get('x-request-id') ?? crypto.randomUUID();
  request.headers.set('x-request-id', requestId);

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
  response.headers.set('x-request-id', requestId);

  // Evita carregar o supabase client em recursos estáticos para performance
  if (request.nextUrl.pathname.startsWith('/_next') || request.nextUrl.pathname.includes('.')) {
      return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set({ name, value, ...options }))
          response = NextResponse.next({
            request,
          })
          response.headers.set('x-request-id', requestId)
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set({ name, value, ...options })
          )
        },
      },
    }
  )

  // IMPORTANTE: Usamos getUser() em vez de getSession() para garantir que metadados 
  // (como must_change_password) estejam 100% atualizados e evitar loops.
  const { data: { user } } = await supabase.auth.getUser()
  const session = user ? { user } : null;

  // Proteger rotas /dashboard originando flash of content
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      return NextResponse.redirect(redirectUrl)
    }

    if (request.nextUrl.pathname === '/dashboard/first-access') {
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
