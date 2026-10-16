import { createClient } from '@supabase/supabase-js';
import { SENHA_PADRAO } from '@/lib/senha-padrao';
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

// Ver src/lib/senha-padrao.ts (variável SENHA_PADRAO_INICIAL, com a histórica de reserva).
const DEFAULT_PASSWORD = SENHA_PADRAO;

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
      .select('id, name, full_name, arquivado_em')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      // Diz DE QUEM é o e-mail. "Já cadastrado" sozinho fazia a secretaria
      // procurar a conta na lista, não achar (a lista cortava em 1.000) e
      // concluir que o sistema estava errado.
      const dono = existing.name?.trim() || existing.full_name?.trim();
      const situacao = existing.arquivado_em ? ' (arquivada)' : '';
      return NextResponse.json(
        {
          error: dono
            ? `O e-mail ${email} já é de ${dono}${situacao}. Procure por esse nome em Usuários e use "Redefinir senha" se for a mesma pessoa. Se for outra pessoa com nome parecido, informe um e-mail diferente.`
            : `O e-mail ${email} já é de uma conta antiga sem nome${situacao}. Procure pelo e-mail em Usuários, ou informe um e-mail diferente.`,
        },
        { status: 409 }
      );
    }

    // ── Guarda contra conta duplicada da MESMA pessoa ────────────────────
    //
    // Checar só o e-mail não bastava, porque o e-mail é derivado do nome por
    // uma regra que mudou ao longo do tempo. "Abner de Jesus Jales da Silva"
    // virou `abnerjsilva@` numa versão (inicial do primeiro nome do meio),
    // `abnerdsilva@` em outra (inicial da segunda palavra, que aqui é a
    // preposição "de") e `abnersilva@` na regra de duas partes. Resultado em
    // produção: 201 nomes com mais de uma conta, 202 contas excedentes, e o
    // boletim do aluno espalhado entre elas.
    //
    // Nomes brasileiros com preposição são a maioria, então isso não era caso
    // raro — era o caso comum.
    const nomeNormalizado = fullName.trim().replace(/\s+/g, ' ').toLowerCase();
    const { data: mesmoNome } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .ilike('full_name', nomeNormalizado)
      .limit(3);

    if (mesmoNome && mesmoNome.length > 0 && !emailOverride) {
      return NextResponse.json(
        {
          error: `Já existe cadastro para "${fullName}" (${mesmoNome.map(m => m.email).join(', ')}). ` +
                 `Se for outra pessoa com o mesmo nome, informe um e-mail de login diferente para prosseguir.`,
          duplicado: true,
          existentes: mesmoNome,
        },
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
        // A conta nasce com a senha padrão, que todo mundo conhece (está até na
        // tela de primeiro acesso). Sem a troca obrigatória, ela valia para
        // sempre: em 16/10, a maioria das contas criadas aqui ainda entrava com
        // ela. Ligado, o middleware leva ao /dashboard/first-access no primeiro
        // login, e o link de senha (`/reset-password`) desliga ao gravar.
        must_change_password: true,
        profile_type: profileType || role,
        institution: institution || '',
        exam_target: examTarget || 'ENEM',
        course: course || '',
        cpf: cpf || '',
      },
    });

    if (createError) {
      // Login antigo sem perfil (há algumas centenas desde fev–abr): o Supabase
      // recusa em inglês e a secretaria não sabia o que fazer.
      if (/already (been )?registered|email_exists/i.test(`${createError.code ?? ''} ${createError.message ?? ''}`)) {
        return NextResponse.json(
          { error: `O e-mail ${email} já tem um login antigo, sem cadastro na plataforma. Informe um e-mail diferente ou peça à equipe técnica para liberar esse login.` },
          { status: 409 }
        );
      }
      throw createError;
    }
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
