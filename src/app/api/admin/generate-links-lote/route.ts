import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/server-auth';
import { origemDoLink } from '@/lib/link-de-senha';
import { segredoDoLink } from '@/lib/link-de-senha-token';
import { emitirLinkDeSenha } from '@/lib/link-de-senha-emitir';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Links de senha de 24 h para VÁRIOS alunos de uma vez (tela
 * `/dashboard/admin/links-de-senha`). Mutirão de senhas de 17–18/10: a
 * secretaria gera os links da sala e cola no WhatsApp de cada aluno.
 *
 * Mesmo link do avulso (`emitirLinkDeSenha`): cada um só serve para a conta
 * daquele aluno, e gerar de novo cancela o anterior. Só admin/staff.
 */

const MAXIMO_POR_PEDIDO = 300;
const EM_PARALELO = 8;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Configuração do servidor incompleta' }, { status: 500 });
  }
  if (!segredoDoLink()) {
    return NextResponse.json(
      { error: 'Links em lote precisam de LINK_SENHA_SECRET (ou PASSWORD_RESET_TOKEN_SECRET) na Vercel.' },
      { status: 503 },
    );
  }

  let corpo: any;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 });
  }
  const ids: string[] = Array.isArray(corpo?.ids)
    ? [...new Set<string>(corpo.ids.filter((x: unknown): x is string => typeof x === 'string' && UUID.test(x)))]
    : [];
  if (ids.length === 0) return NextResponse.json({ error: 'Escolha pelo menos um aluno.' }, { status: 400 });
  if (ids.length > MAXIMO_POR_PEDIDO) {
    return NextResponse.json({ error: `No máximo ${MAXIMO_POR_PEDIDO} alunos por vez.` }, { status: 400 });
  }

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const origem = origemDoLink(request.headers.get('origin'), process.env.NEXT_PUBLIC_APP_URL);

  const { data: perfis } = await sb.from('profiles').select('id, name, full_name').in('id', ids);
  const nomes = new Map((perfis ?? []).map((p) => [p.id, p.name?.trim() || p.full_name?.trim() || null]));

  const links: { id: string; nome: string | null; email?: string; link?: string; erro?: string }[] = [];
  for (let i = 0; i < ids.length; i += EM_PARALELO) {
    const lote = ids.slice(i, i + EM_PARALELO);
    const feitos = await Promise.all(
      lote.map(async (id) => {
        const nome = nomes.get(id) ?? null;
        if (!nomes.has(id)) return { id, nome, erro: 'Sem perfil' };
        try {
          const r = await emitirLinkDeSenha(sb, id, origem, 'redefinir');
          return r.ok
            ? { id, nome, email: r.email, link: r.link }
            : { id, nome, erro: r.motivo === 'sem_conta' ? 'Sem login' : 'Falhou, tente de novo' };
        } catch {
          return { id, nome, erro: 'Falhou, tente de novo' };
        }
      }),
    );
    links.push(...feitos);
  }

  return NextResponse.json({ links, expiresIn: '24 horas' });
}
