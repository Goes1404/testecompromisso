import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { verifyRegistrationToken } from '@/lib/registration-token';

const SUPABASE_TIMEOUT_MS = 10_000;

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

function makeAdmin(signal: AbortSignal) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        fetch: (url: RequestInfo | URL, options?: RequestInit) =>
          fetch(url, { ...options, signal }),
      },
    }
  );
}

export async function POST(request: Request) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);

  try {
    const body = await request.json();
    const { action } = body;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[PRIMEIRO_ACESSO] Missing ENV vars');
      return NextResponse.json({ error: 'Configuração do servidor incompleta.' }, { status: 500 });
    }

    const supabaseAdmin = makeAdmin(controller.signal);

    // 1. AÇÃO: BUSCAR ALUNO
    if (action === 'search') {
      const { fullName } = body;
      if (!fullName?.trim()) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });

      console.log('[PRIMEIRO_ACESSO] Busca de aluno recebida');

      const generatedEmail = generateEmail(fullName.trim());
      // Segurança: remove caracteres de controle do PostgREST (vírgula/parênteses/*) antes
      // de interpolar no filtro .or(), evitando injeção de filtro. Nomes reais não usam isso.
      const safeName = fullName.trim().replace(/[,()*\\]/g, ' ').replace(/\s+/g, ' ').trim();

      const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('id, email, name')
        .or(`email.eq.${generatedEmail},name.ilike.%${safeName}%`)
        .limit(1);

      if (error) {
        console.error('[PRIMEIRO_ACESSO] Erro na query:', error);
        throw error;
      }

      if (profiles && profiles.length > 0) {
        return NextResponse.json({
          found: true,
          user: { id: profiles[0].id, email: profiles[0].email, name: profiles[0].name }
        });
      } else {
        return NextResponse.json({ found: false });
      }
    }

    // 2. AÇÃO: RESETAR SENHA
    if (action === 'reset') {
      const { userId, newPassword, phone } = body;

      if (!userId || !newPassword || newPassword.length < 8) {
        return NextResponse.json({ error: 'Dados inválidos ou senha curta.' }, { status: 400 });
      }

      const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (getUserError || !userData?.user) {
        return NextResponse.json({ error: 'Usuário de autenticação não localizado.' }, { status: 404 });
      }

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
        email_confirm: true,
        user_metadata: {
          full_name: userData.user.user_metadata?.full_name,
          must_change_password: false,
        },
      });
      if (updateError) {
        return NextResponse.json({ error: 'Falha ao gravar nova senha.' }, { status: 500 });
      }

      if (phone) {
        await supabaseAdmin.from('profiles').update({ phone }).eq('id', userId);
      }

      return NextResponse.json({ success: true });
    }

    // 3. AÇÃO: CADASTRAR NOVO
    if (action === 'register') {
      const { fullName, examTarget, password, institution, classroom, inviteToken } = body;

      // Validação do Token de Convite
      if (!inviteToken) {
        return NextResponse.json({ error: 'O cadastro requer um link de convite válido.' }, { status: 401 });
      }

      const tokenStatus = verifyRegistrationToken(inviteToken);
      if (tokenStatus === 'expired') {
        return NextResponse.json({ error: 'Este link de convite expirou. Peça um novo ao coordenador.' }, { status: 403 });
      }
      if (tokenStatus === 'invalid') {
        return NextResponse.json({ error: 'Link de convite inválido ou adulterado.' }, { status: 403 });
      }

      if (!fullName?.trim() || !password || password.length < 8) {
        return NextResponse.json({ error: 'Preencha todos os campos corretamente.' }, { status: 400 });
      }

      const email = generateEmail(fullName);
      const username = email.replace('@compromisso.com', '');

      const { data: existing } = await supabaseAdmin.from('profiles').select('id').eq('email', email).maybeSingle();
      if (existing) {
        return NextResponse.json({ error: 'Este perfil já existe. Tente recuperar pelo seu nome.' }, { status: 409 });
      }

      console.log('[PRIMEIRO_ACESSO] Criando Auth User (student) via convite');
      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          profile_type: 'student',
          role: 'student',
          exam_target: examTarget || 'ENEM',
          institution: institution || '',
          course: classroom || '',
        },
      });

      if (createError) {
        console.error('[PRIMEIRO_ACESSO] Erro ao criar Auth User:', createError);
        throw createError;
      }

      console.log('[PRIMEIRO_ACESSO] Auth User criado. Criando Profile...');

      const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
        id: authData.user.id,
        name: fullName,
        email,
        username,
        profile_type: 'student',
        role: 'student',
        status: 'active',
        exam_target: examTarget || 'ENEM',
        institution: institution || null,
        course: classroom || null,
      });

      if (profileError) {
        console.error('[PRIMEIRO_ACESSO] Erro ao criar Profile:', profileError);
        // Tenta limpar o auth user se o profile falhar
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw profileError;
      }

      console.log('[PRIMEIRO_ACESSO] Cadastro concluído com sucesso');

      return NextResponse.json({ success: true, email });
    }

    return NextResponse.json({ error: 'Ação não permitida.' }, { status: 400 });

  } catch (error: any) {
    if (error?.name === 'AbortError') {
      return NextResponse.json(
        { error: 'O servidor demorou muito para responder. Tente novamente em instantes.' },
        { status: 503 }
      );
    }
    console.error('[PRIMEIRO_ACESSO_CRITICAL]', error);
    return NextResponse.json(
      { error: error.message || 'Erro crítico no servidor.' },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
