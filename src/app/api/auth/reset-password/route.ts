import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { email, newPassword, masterPassword } = await request.json();

    // 1. Validação da Senha Mestra
    if (masterPassword !== 'compromisso2026') {
      return NextResponse.json(
        { error: 'Senha mestra inválida' },
        { status: 401 }
      );
    }

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: 'E-mail e nova senha são obrigatórios' },
        { status: 400 }
      );
    }

    // 2. Inicializar Cliente Supabase com Service Role (Admin)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Configuração do Supabase incompleta (.env.local)');
      return NextResponse.json(
        { error: 'Erro de configuração no servidor. Verifique o SERVICE_ROLE_KEY.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 3. Validar se o e-mail existe no banco de dados
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'E-mail não encontrado em nossa base de dados' },
        { status: 404 }
      );
    }

    // 4. Resetar senha via Admin API (Sem deletar/reproducir o usuário)
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      profile.id,
      { password: newPassword }
    );

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ message: 'Senha atualizada com sucesso' });

  } catch (error: any) {
    console.error('Erro no reset de senha:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao processar reset' },
      { status: 500 }
    );
  }
}


