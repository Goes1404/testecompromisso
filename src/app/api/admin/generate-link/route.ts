import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/server-auth';
import { TIPO_DO_TOKEN, finalidadeDe, montarLinkDeSenha, origemDoLink } from '@/lib/link-de-senha';

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
 * O link aponta para `/reset-password?token_hash=…`, não para o `action_link`
 * do Supabase: o token só vira sessão quando o aluno toca em "Continuar".
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

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: TIPO_DO_TOKEN,
      email: email.trim().toLowerCase(),
    });

    if (error) {
      const semConta = error.status === 404 || /not.?found/i.test(error.message ?? '');
      if (semConta) {
        return NextResponse.json(
          { error: 'Não existe conta com este e-mail. Crie o usuário antes de gerar o link.' },
          { status: 404 }
        );
      }
      throw error;
    }

    const tokenHash = data?.properties?.hashed_token;
    if (!tokenHash) throw new Error('Supabase não retornou um link válido');

    const origem = origemDoLink(request.headers.get('origin'), process.env.NEXT_PUBLIC_APP_URL);
    const link = montarLinkDeSenha(origem, tokenHash, finalidadeDe(type));

    return NextResponse.json({
      success: true,
      link,
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
