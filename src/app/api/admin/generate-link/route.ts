import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// type: 'invite'   → link de primeiro acesso (novo usuário define a senha)
// type: 'recovery' → link de reset de senha (usuário existente redefine)
export async function POST(request: Request) {
  try {
    const { masterPassword, email, type } = await request.json();

    if (masterPassword !== process.env.ADMIN_MASTER_PASSWORD && masterPassword !== 'compromisso2026') {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 401 });
    }

    if (!email || !type || !['invite', 'recovery'].includes(type)) {
      return NextResponse.json(
        { error: 'E-mail e tipo (invite | recovery) são obrigatórios' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Configuração do servidor incompleta' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Detectar a URL base da aplicação via header Origin
    const origin =
      request.headers.get('origin') ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000';

    // O redirectTo deve apontar para o auth/callback com o destino como `next`
    // O callback irá trocar o code por sessão e redirecionar para a página correta
    const destination = type === 'recovery'
      ? '/reset-password'
      : '/dashboard/first-access';

    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(destination)}`;

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: type as 'invite' | 'recovery',
      email: email.toLowerCase(),
      options: { redirectTo },
    });

    if (error) throw error;

    const actionLink = data?.properties?.action_link;
    if (!actionLink) throw new Error('Supabase não retornou um link válido');

    return NextResponse.json({
      success: true,
      link: actionLink,
      type,
      expiresIn: '1 hora',
    });

  } catch (error: any) {
    console.error('[ADMIN_GENERATE_LINK]', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar link temporário' },
      { status: 500 }
    );
  }
}
