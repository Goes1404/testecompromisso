import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/server-auth';
import { TIPO_DO_TOKEN, finalidadeDe, montarLinkDeConvite, montarLinkDeSenha, origemDoLink } from '@/lib/link-de-senha';
import { assinarLinkDeSenha, segredoDoLink } from '@/lib/link-de-senha-token';

/**
 * Link de senha para UM aluno, gerado pela secretaria.
 *
 * `type: 'invite'`   → "Link de Primeiro Acesso" (logo depois de criar a conta)
 * `type: 'recovery'` → "Link de Reset" (senha esquecida)
 *
 * Os dois geram o mesmo token (`recovery`) e o mesmo tipo de link, que serve
 * para criar E para redefinir a senha: ver `src/lib/link-de-senha.ts` para o
 * porquê (o convite do Supabase recusava conta já criada, e o link antigo caía
 * sempre em "Link expirado").
 *
 * Desde 16/10 o link vale 24 h e funciona várias vezes (`?convite=…`, assinado
 * pela plataforma — `src/lib/link-de-senha-token.ts`). Cada link novo sobe
 * `app_metadata.link_senha_versao` e cancela o anterior. Sem segredo configurado
 * (`LINK_SENHA_SECRET` ou `PASSWORD_RESET_TOKEN_SECRET`), cai no link de 1 h do
 * Supabase (`?token_hash=…`, uso único), que continua funcionando.
 */
export async function POST(request: Request) {
  try {
    // Segurança: exige sessão de admin/staff (cookie) em vez de senha mestra no body.
    const admin = await requireAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { email, type } = await request.json();

    if (!email || typeof email !== 'string' || !type || !['invite', 'recovery'].includes(type)) {
      return NextResponse.json(
        { error: 'E-mail e tipo (invite | recovery) são obrigatórios' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Configuração do servidor incompleta' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const emailLimpo = email.trim().toLowerCase();
    const origem = origemDoLink(request.headers.get('origin'), process.env.NEXT_PUBLIC_APP_URL);
    const finalidade = finalidadeDe(type);
    const semConta = () => NextResponse.json(
      { error: 'Não existe conta com este e-mail. Crie o usuário antes de gerar o link.' },
      { status: 404 }
    );

    if (segredoDoLink()) {
      // ilike sem curinga (o `_` é comum em login): só ignora maiúsculas.
      const padrao = emailLimpo.replace(/[\\%_]/g, (c) => `\\${c}`);
      const { data: perfis } = await supabaseAdmin
        .from('profiles').select('id').ilike('email', padrao).limit(2);
      if (!perfis?.length) return semConta();
      if (perfis.length > 1) {
        return NextResponse.json({ error: 'Mais de um perfil com este e-mail. Fale com o suporte.' }, { status: 409 });
      }
      const perfil = perfis[0];

      const { data: alvo, error: erroAlvo } = await supabaseAdmin.auth.admin.getUserById(perfil.id);
      // O link fica preso ao id; a tela entra com o e-mail de login da conta
      // (em 3 perfis, em 16/10, ele difere de profiles.email).
      if (erroAlvo || !alvo?.user) return semConta();

      // Versão nova cancela os links anteriores deste aluno. app_metadata é
      // SUBSTITUÍDO pela Admin API: mescla. (Não mexe em user_metadata, que
      // dispara o gatilho de perfil.)
      const versao = (Number(alvo.user.app_metadata?.link_senha_versao) || 0) + 1;
      const { error: erroVersao } = await supabaseAdmin.auth.admin.updateUserById(perfil.id, {
        app_metadata: { ...(alvo.user.app_metadata ?? {}), link_senha_versao: versao },
      });
      if (erroVersao) throw erroVersao;

      return NextResponse.json({
        success: true,
        link: montarLinkDeConvite(origem, assinarLinkDeSenha(perfil.id, versao), finalidade),
        type,
        expiresIn: '24 horas',
      });
    }

    console.warn('[ADMIN_GENERATE_LINK] sem LINK_SENHA_SECRET: link de 1 hora do Supabase');
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: TIPO_DO_TOKEN,
      email: emailLimpo,
    });

    if (error) {
      if (error.status === 404 || /not.?found/i.test(error.message ?? '')) return semConta();
      throw error;
    }

    const tokenHash = data?.properties?.hashed_token;
    if (!tokenHash) throw new Error('Supabase não retornou um link válido');

    return NextResponse.json({
      success: true,
      link: montarLinkDeSenha(origem, tokenHash, finalidade),
      type,
      expiresIn: '1 hora',
    });

  } catch (error: any) {
    console.error('[ADMIN_GENERATE_LINK]', error?.message ?? error);
    return NextResponse.json(
      { error: 'Erro ao gerar o link. Tente de novo em instantes.' },
      { status: 500 }
    );
  }
}
