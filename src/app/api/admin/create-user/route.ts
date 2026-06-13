import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/server-auth';

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

const DEFAULT_PASSWORD = 'compromisso2026';

export async function POST(request: Request) {
  try {
    // Segurança: exige sessão de admin/staff (cookie) em vez de senha mestra no body.
    const admin = await requireAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const {
      fullName,
      cpf,
      profileType,
      role,
      institution,
      course,
      sala,
      turno,
      examTarget,
      emailOverride,
      birthDate,
    } = await request.json();

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
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        must_change_password: false,
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
      sala: sala || null,
      turno: turno || null,
      exam_target: examTarget || null,
      birth_date: birthDate || null,
    });

    if (profileError) {
      // Rollback: remover usuário do Auth se o profile falhar
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    return NextResponse.json({
      success: true,
      user: { id: authData.user.id, email, name: fullName },
      defaultPassword: DEFAULT_PASSWORD,
    });

  } catch (error: any) {
    console.error('[ADMIN_CREATE_USER]', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao criar usuário' },
      { status: 500 }
    );
  }
}
