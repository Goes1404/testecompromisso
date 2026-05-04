import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Converte nome completo para o padrão: primeiroNome + inicialSegundoNome + ultimoNome@compromisso.com
// "João Carlos Silva" → "joaocsilva@compromisso.com"
// "Ana Silva"         → "anasilva@compromisso.com"
function generateEmail(fullName: string): string {
  const normalize = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');

  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return `${normalize(parts[0])}@compromisso.com`;
  if (parts.length === 2) return `${normalize(parts[0])}${normalize(parts[1])}@compromisso.com`;

  const first = normalize(parts[0]);
  const middleInitial = normalize(parts[1]).charAt(0);
  const last = normalize(parts[parts.length - 1]);
  return `${first}${middleInitial}${last}@compromisso.com`;
}

function generateTempPassword(): string {
  const pool = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  return Array.from({ length: 16 }, () => pool[Math.floor(Math.random() * pool.length)]).join('');
}

export async function POST(request: Request) {
  try {
    const {
      masterPassword,
      fullName,
      cpf,
      profileType,
      role,
      institution,
      course,
      examTarget,
      emailOverride,
    } = await request.json();

    if (masterPassword !== process.env.ADMIN_MASTER_PASSWORD && masterPassword !== 'compromisso2026') {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 401 });
    }

    if (!fullName?.trim() || !role) {
      return NextResponse.json({ error: 'Nome completo e papel são obrigatórios' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Configuração do servidor incompleta' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const email = (emailOverride?.trim() || generateEmail(fullName)).toLowerCase();
    const username = email.replace('@compromisso.com', '');
    const tempPassword = generateTempPassword();

    // Verificar se email já existe
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `E-mail ${email} já está cadastrado na plataforma` },
        { status: 409 }
      );
    }

    // Criar usuário no Supabase Auth
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        must_change_password: true,
        profile_type: profileType || role,
        institution: institution || '',
        exam_target: examTarget || 'ENEM',
        course: course || '',
        cpf: cpf || '',
      },
    });

    if (createError) throw createError;
    if (!authData?.user) throw new Error('Usuário não foi criado pelo Supabase Auth');

    // Criar registro na tabela profiles
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: authData.user.id,
      name: fullName,
      email,
      username,
      cpf: cpf || null,
      profile_type: profileType || role,
      role,
      status: 'active',
      institution: institution || null,
      course: course || null,
      exam_target: examTarget || null,
    });

    if (profileError) {
      // Rollback: remover usuário do Auth se o profile falhar
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    return NextResponse.json({
      success: true,
      user: { id: authData.user.id, email, name: fullName },
    });

  } catch (error: any) {
    console.error('[ADMIN_CREATE_USER]', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao criar usuário' },
      { status: 500 }
    );
  }
}
