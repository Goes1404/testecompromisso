import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';

export async function getAuthUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}

async function getProfileRole(userId: string): Promise<string | null> {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  return data?.role ?? null;
}

/** Requer admin ou staff. */
export async function requireAdminUser(): Promise<User | null> {
  const user = await getAuthUser();
  if (!user) return null;
  const role = await getProfileRole(user.id);
  if (!role || !['admin', 'staff'].includes(role)) return null;
  return user;
}

/**
 * Igual a `requireAdminUser()`, mas já devolve a resposta de recusa com o
 * motivo certo. "Não autorizado" sozinho não dizia nada à secretaria: em 31/10
 * a sessão da conta `adm@` tinha sido encerrada por um "Sair" em outro
 * computador e a tela continuava aberta, parecendo logada.
 */
export async function exigirAdmin(): Promise<
  { user: User; negado?: undefined } | { user?: undefined; negado: NextResponse }
> {
  const user = await getAuthUser();
  if (!user) {
    return {
      negado: NextResponse.json(
        {
          error:
            'Sua sessão foi encerrada (alguém pode ter saído desta conta em outro computador). Saia e entre de novo.',
          codigo: 'sem_sessao',
        },
        { status: 401 }
      ),
    };
  }
  const role = await getProfileRole(user.id);
  if (!role || !['admin', 'staff'].includes(role)) {
    return {
      negado: NextResponse.json(
        { error: 'Esta conta não tem permissão de administrador.', codigo: 'sem_permissao' },
        { status: 403 }
      ),
    };
  }
  return { user };
}

/** Requer professor, admin ou staff. */
export async function requireTeacherOrAdmin(): Promise<User | null> {
  const user = await getAuthUser();
  if (!user) return null;
  const role = await getProfileRole(user.id);
  if (!role || !['teacher', 'admin', 'staff'].includes(role)) return null;
  return user;
}
