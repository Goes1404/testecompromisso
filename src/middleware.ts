import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAuthRetryableFetchError } from '@supabase/supabase-js'

// Quanto o middleware espera o Auth antes de deixar a página seguir.
const PRAZO_DO_AUTH_MS = 4000;

/** Resolve com o resultado, ou com `null` se o prazo estourar antes. */
function comPrazo<T>(promessa: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const prazo = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  return Promise.race([promessa, prazo]).finally(() => clearTimeout(timer));
}

/** Falha de rede ou do servidor do Auth — não diz nada sobre a sessão. */
function ehFalhaDeRede(err: unknown): boolean {
  if (isAuthRetryableFetchError(err)) return true;
  const status = (err as { status?: number } | null)?.status;
  return typeof status === 'number' && (status === 0 || status >= 500);
}

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

  // ── Curto-circuito sem sessão (corrige TTFB) ────────────────────────────
  // O Supabase SSR guarda o token em cookie `sb-<ref>-auth-token` (às vezes
  // fatiado em `.0`/`.1`). Se NENHUM cookie de auth existe, não há sessão a
  // validar — e `getUser()` faria mesmo assim uma chamada de rede à API do
  // Supabase (~3s no visitante frio, além das tentativas de refresh que
  // falham no log). Sem cookie: decide na hora, sem tocar a rede.
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'));

  if (!hasAuthCookie) {
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/login';
      return NextResponse.redirect(redirectUrl);
    }
    // /login (ou qualquer rota pública casada): serve direto, sem rede.
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

  // Quem é o usuário, sem ida à rede quando dá (17/10).
  //
  // Antes era `getUser()` em toda navegação: uma chamada a `/auth/v1/user` por
  // página. No começo das aulas de 17/10 foram ~1.800 em 6 minutos, o Supabase
  // engasgou, e cada página ficava 25 s presa aqui até a Vercel matar a função
  // (ERR_CONNECTION_ABORTED no celular do aluno). `getClaims()` confere a
  // assinatura do token com a chave pública do projeto (ES256, guardada em
  // memória), sem rede; só renova o token quando ele venceu.
  //
  // Três regras para o Supabase lento não virar queda do site:
  // 1. Prazo de `PRAZO_DO_AUTH_MS`. Estourou: a página segue sem decidir nada
  //    (os dados continuam protegidos por RLS; o AuthProvider cuida do resto).
  // 2. Erro de rede/5xx NÃO é sessão inválida. Antes ele apagava o cookie e
  //    mandava para o login: num engasgo, deslogava a escola inteira, e todo
  //    mundo entrando de novo de uma vez piorava o engasgo.
  // 3. Só erro de verdade do Auth (token recusado, refresh inexistente) apaga
  //    o cookie — o caso de `Invalid Refresh Token` de 16/06–10/08.
  let user: { id: string; user_metadata?: Record<string, unknown> } | null = null;
  let sessaoInvalida = false;
  let indefinido = false;
  try {
    const resultado = await comPrazo(supabase.auth.getClaims(), PRAZO_DO_AUTH_MS);
    if (resultado === null) {
      indefinido = true;
    } else {
      const { data, error } = resultado;
      if (data?.claims?.sub) {
        user = {
          id: data.claims.sub,
          user_metadata: (data.claims.user_metadata ?? {}) as Record<string, unknown>,
        };
      } else if (error && ehFalhaDeRede(error)) {
        indefinido = true;
      } else if (error) {
        sessaoInvalida = true;
      }
    }
  } catch (err) {
    if (ehFalhaDeRede(err)) indefinido = true;
    else sessaoInvalida = true;
  }

  // Sem resposta do Auth: não redireciona e não apaga nada.
  if (indefinido) return response;

  const session = user ? { user } : null;

  // Cookie de sessão morto precisa ser APAGADO, não apenas ignorado.
  //
  // Antes, o cookie inválido permanecia no navegador: a cada nova página o
  // curto-circuito acima via um cookie de auth, entrava aqui e refazia a
  // chamada de rede que já tinha falhado. O aluno pagava a latência dessa ida
  // e volta em toda navegação, e o log enchia. Limpando, a próxima requisição
  // resolve na hora, sem rede.
  if (sessaoInvalida) {
    const destino = request.nextUrl.clone();
    destino.pathname = '/login';
    // A tela de login usa isto para explicar o que houve, em vez de deixar o
    // aluno achar que errou a senha.
    destino.searchParams.set('sessao', 'expirada');

    const limpa = request.nextUrl.pathname.startsWith('/dashboard')
      ? NextResponse.redirect(destino)
      : response;

    for (const c of request.cookies.getAll()) {
      if (c.name.startsWith('sb-') && c.name.includes('auth-token')) {
        limpa.cookies.delete(c.name);
      }
    }
    limpa.headers.set('x-request-id', requestId);
    return limpa;
  }

  // Proteger rotas /dashboard originando flash of content
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      return NextResponse.redirect(redirectUrl)
    }

    // ── Primeiro acesso ──────────────────────────────────────────────────
    //
    // Antes, QUALQUER acesso a `/dashboard/first-access` era mandado para a
    // home — sem condição nenhuma. A tela existia, funcionava (troca a senha
    // no passo 1, completa o perfil no passo 2), e era inalcançável.
    //
    // Duas consequências em produção: 366 alunos ficaram com
    // `must_change_password: true` para sempre, ainda usando a senha padrão; e
    // o link que a secretaria gera em `/api/admin/generate-link` aponta
    // justamente para `/dashboard/first-access` — o aluno clicava, era jogado
    // para a home e nunca trocava a senha.
    //
    // A condição correta é o metadado, não a rota. Assim não há o
    // redirect-loop que motivou o bloqueio original: quem precisa trocar entra
    // e fica; quem já trocou é mandado para fora.
    // O metadado do token só se atualiza quando o token renova (até 1 h).
    // Quem acabou de trocar a senha ainda carrega `true` no token antigo e
    // ficaria preso no primeiro acesso; por isso o `true` é confirmado no
    // servidor (`getUser`). O `false` vale como está — é a imensa maioria, e é
    // ela que não pode custar ida à rede.
    let precisaTrocarSenha = user?.user_metadata?.must_change_password === true;
    if (precisaTrocarSenha) {
      try {
        const confirmado = await comPrazo(supabase.auth.getUser(), PRAZO_DO_AUTH_MS);
        if (confirmado?.data?.user) {
          precisaTrocarSenha = confirmado.data.user.user_metadata?.must_change_password === true;
        }
      } catch {
        // Fica com o que o token diz.
      }
    }
    const estaNoPrimeiroAcesso = request.nextUrl.pathname === '/dashboard/first-access';

    if (precisaTrocarSenha && !estaNoPrimeiroAcesso) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard/first-access'
      return NextResponse.redirect(redirectUrl)
    }

    if (!precisaTrocarSenha && estaNoPrimeiroAcesso) {
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
