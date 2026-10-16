import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { conferirLinkDeSenha } from '@/lib/link-de-senha-token';
import { senhaAtendeRequisitos } from '@/lib/link-de-senha';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * O link de senha que a secretaria gera (`/api/admin/generate-link`), lido pela
 * tela `/reset-password?convite=…`. Sem sessão: quem prova o direito de trocar
 * a senha é o link assinado (`src/lib/link-de-senha-token.ts`).
 *
 *   acao 'conferir' → { email, nome, expiraEm }   (para mostrar de quem é a conta)
 *   acao 'gravar'   → troca a senha e devolve { email } para a tela entrar
 *
 * O link vale 24 h e funciona várias vezes (pedido da coordenação, 16/10).
 * Por isso, nesta rota:
 *   - só vale a versão mais recente do link (`app_metadata.link_senha_versao`):
 *     a secretaria gerar outro cancela o anterior;
 *   - no máximo 10 trocas por link em 24 h e 30 tentativas por IP por hora;
 *   - cada troca avisa o aluno no sininho ("se não foi você, procure a
 *     secretaria") — é a detecção de link encaminhado.
 */

const MAX_TROCAS_POR_LINK = 10;
const MAX_POR_IP_HORA = 30;

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function ipDe(req: Request): string {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'desconhecido';
}

const recusa = (status: number, error: string) => NextResponse.json({ error }, { status });

const LINK_SEM_VALIDADE = 'Este link passou do prazo de 24 horas ou foi substituído por um mais novo. Peça um link novo à secretaria.';

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return recusa(500, 'Configuração do servidor incompleta.');
  }

  let corpo: any;
  try {
    corpo = await request.json();
  } catch {
    return recusa(400, 'Pedido inválido.');
  }
  const { acao, token, senha } = corpo ?? {};
  if (acao !== 'conferir' && acao !== 'gravar') return recusa(400, 'Pedido inválido.');

  const link = conferirLinkDeSenha(typeof token === 'string' ? token : null);
  if (!link.ok) return recusa(410, link.motivo === 'expirado' ? LINK_SEM_VALIDADE : 'Link inválido. Copie o link inteiro da mensagem ou peça outro à secretaria.');

  const sb = admin();
  const ip = ipDe(request);
  const idDoLink = `link-senha:${createHash('sha256').update(String(token)).digest('hex')}`;

  // Freio contra força bruta e uso em massa, antes de qualquer coisa cara.
  try {
    const { count } = await sb.from('password_reset_attempts').select('id', { count: 'exact', head: true })
      .eq('ip', ip).like('identifier', 'link-senha:%').gte('created_at', new Date(Date.now() - 3_600_000).toISOString());
    if ((count ?? 0) >= MAX_POR_IP_HORA) return recusa(429, 'Muitas tentativas deste local. Espere uma hora.');
  } catch {
    /* tabela indisponível: degrada sem travar o aluno */
  }

  const { data: alvo, error: erroUsuario } = await sb.auth.admin.getUserById(link.userId);
  const usuario = alvo?.user;
  if (erroUsuario || !usuario?.email) return recusa(410, LINK_SEM_VALIDADE);
  if (Number(usuario.app_metadata?.link_senha_versao) !== link.versao) return recusa(410, LINK_SEM_VALIDADE);
  if (usuario.banned_until && new Date(usuario.banned_until).getTime() > Date.now()) {
    return recusa(403, 'Esta conta está bloqueada. Fale com a secretaria.');
  }

  const { data: perfil } = await sb.from('profiles')
    .select('name, full_name, arquivado_em').eq('id', link.userId).maybeSingle();
  if (perfil?.arquivado_em) return recusa(403, 'Esta conta está arquivada. Fale com a secretaria.');
  const nome = perfil?.name?.trim() || perfil?.full_name?.trim() || null;

  if (acao === 'conferir') {
    return NextResponse.json({ email: usuario.email, nome, expiraEm: link.expiraEm });
  }

  // ── gravar ──────────────────────────────────────────────────────────────
  if (typeof senha !== 'string' || !senhaAtendeRequisitos(senha)) {
    return recusa(400, 'A senha precisa ter 8 caracteres ou mais, com letra maiúscula, número e símbolo.');
  }

  try {
    const { count } = await sb.from('password_reset_attempts').select('id', { count: 'exact', head: true })
      .eq('identifier', idDoLink).eq('success', true)
      .gte('created_at', new Date(Date.now() - 86_400_000).toISOString());
    if ((count ?? 0) >= MAX_TROCAS_POR_LINK) {
      return recusa(429, 'Este link já foi usado muitas vezes. Peça um link novo à secretaria.');
    }
  } catch {
    /* degrada */
  }

  // A Admin API SUBSTITUI o user_metadata inteiro: mescla com o que já existe.
  const { error: erroTroca } = await sb.auth.admin.updateUserById(link.userId, {
    password: senha,
    user_metadata: { ...(usuario.user_metadata ?? {}), must_change_password: false },
  });
  if (erroTroca) {
    try { await sb.from('password_reset_attempts').insert({ ip, identifier: idDoLink, success: false }); } catch { /* */ }
    console.error('[LINK_DE_SENHA] troca falhou:', erroTroca.message);
    return recusa(500, 'Não foi possível salvar a senha agora. Tente de novo em instantes.');
  }

  try { await sb.from('password_reset_attempts').insert({ ip, identifier: idDoLink, success: true }); } catch { /* */ }

  // Detecção de link encaminhado: o aluno vê no sininho toda troca feita pelo link.
  const quando = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date());
  try {
    await sb.from('notifications').insert({
      user_id: link.userId,
      type: 'info',
      title: 'Sua senha foi trocada',
      body: `A senha foi trocada pelo link da secretaria em ${quando}. Se não foi você, procure a secretaria agora.`,
      url: '/dashboard',
    });
  } catch {
    /* o aviso não pode impedir a troca */
  }

  return NextResponse.json({ email: usuario.email });
}
