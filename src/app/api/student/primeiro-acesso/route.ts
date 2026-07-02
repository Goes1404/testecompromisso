import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { verifyRegistrationToken } from '@/lib/registration-token';
import crypto from 'crypto';

const SUPABASE_TIMEOUT_MS = 10_000;

// ── Rate limit do reset self-service ──────────────────────────────────────
// Por ALVO (hash do nome): trava o chute de data de nascimento num aluno.
// Por IP: bem alto, pois na escola muitos alunos dividem o mesmo Wi-Fi.
const RECOVER_IDENTITY_MAX_PER_HOUR = 8;
const RECOVER_IP_MAX_PER_HOUR = 30;

function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') || '';
  return xff.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}

// Hash do nome normalizado — evita gravar PII no log de tentativas.
function hashIdentifier(name: string): string {
  const norm = name.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(norm).digest('hex');
}

// Telefone como dígitos puros, sem DDI 55, para comparar formatos diferentes.
function normalizePhone(p: string): string {
  let d = (p || '').replace(/\D/g, '');
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  return d;
}

async function checkRecoverRateLimit(admin: any, ip: string, idHash: string): Promise<boolean> {
  try {
    const since = new Date(Date.now() - 3_600_000).toISOString();
    const [byId, byIp] = await Promise.all([
      admin.from('password_reset_attempts').select('id', { count: 'exact', head: true })
        .eq('identifier', idHash).eq('success', false).gte('created_at', since),
      admin.from('password_reset_attempts').select('id', { count: 'exact', head: true })
        .eq('ip', ip).gte('created_at', since),
    ]);
    return (byId.count ?? 0) >= RECOVER_IDENTITY_MAX_PER_HOUR
        || (byIp.count ?? 0) >= RECOVER_IP_MAX_PER_HOUR;
  } catch (e) {
    // Tabela ausente / indisponível → degrada sem travar o reset legítimo.
    console.warn('[RECOVER] rate-limit indisponível (degradando):', e);
    return false;
  }
}

async function recordRecoverAttempt(admin: any, ip: string, idHash: string, success: boolean) {
  try {
    await admin.from('password_reset_attempts').insert({ ip, identifier: idHash, success });
  } catch {
    /* degrada silenciosamente */
  }
}

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

      // Segurança: rate-limit por IP também na busca, para dificultar enumeração
      // em massa de alunos (varredura de nomes). Degrada sem travar se a tabela
      // de tentativas estiver indisponível.
      const ip = getClientIp(request);
      const idHash = hashIdentifier(fullName);
      if (await checkRecoverRateLimit(supabaseAdmin, ip, idHash)) {
        return NextResponse.json(
          { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
          { status: 429 }
        );
      }

      const generatedEmail = generateEmail(fullName.trim());
      // Segurança: remove caracteres de controle do PostgREST (vírgula/parênteses/*) antes
      // de interpolar no filtro .or(), evitando injeção de filtro. Nomes reais não usam isso.
      const safeName = fullName.trim().replace(/[,()*\\]/g, ' ').replace(/\s+/g, ' ').trim();

      const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('email, name')
        .or(`email.eq.${generatedEmail},name.ilike.%${safeName}%`)
        .limit(1);

      if (error) {
        console.error('[PRIMEIRO_ACESSO] Erro na busca');
        throw error;
      }

      await recordRecoverAttempt(supabaseAdmin, ip, idHash, !!(profiles && profiles.length));

      if (profiles && profiles.length > 0) {
        // Não retorna o id interno (UUID) — o cliente só precisa de nome + e-mail
        // de login. Reduz o vazamento de identificadores por enumeração.
        return NextResponse.json({
          found: true,
          user: { email: profiles[0].email, name: profiles[0].name }
        });
      } else {
        return NextResponse.json({ found: false });
      }
    }

    // 2. AÇÃO: RECUPERAR SENHA (self-service, com prova de identidade)
    // Segurança: NÃO confia em userId vindo do cliente. Verifica no servidor
    // que nome + telefone + data de nascimento batem com o cadastro, com
    // rate-limit por alvo e por IP. Mensagens genéricas (anti-enumeração).
    if (action === 'recover') {
      const { fullName, phone, birthDate, newPassword } = body;

      if (!fullName?.trim() || !phone?.trim() || !birthDate?.trim() || !newPassword || newPassword.length < 8) {
        return NextResponse.json(
          { error: 'Preencha todos os campos. A senha precisa de pelo menos 8 caracteres.' },
          { status: 400 }
        );
      }

      const ip = getClientIp(request);
      const idHash = hashIdentifier(fullName);

      // Rate-limit ANTES de qualquer verificação
      if (await checkRecoverRateLimit(supabaseAdmin, ip, idHash)) {
        return NextResponse.json(
          { error: 'Muitas tentativas. Por segurança, aguarde 1 hora ou procure a secretaria.' },
          { status: 429 }
        );
      }

      // Buscar candidatos pelo e-mail gerado (exato) ou pelo nome
      const generatedEmail = generateEmail(fullName.trim());
      const safeName = fullName.trim().replace(/[,()*\\]/g, ' ').replace(/\s+/g, ' ').trim();
      const { data: candidates, error: searchErr } = await supabaseAdmin
        .from('profiles')
        .select('id, phone, birth_date')
        .or(`email.eq.${generatedEmail},name.ilike.%${safeName}%`)
        .limit(10);

      if (searchErr) {
        console.error('[RECOVER] erro na busca:', searchErr);
        throw searchErr;
      }

      // Encontrar o cadastro que bate telefone E data de nascimento
      const inputPhone = normalizePhone(phone);
      const inputBirth = String(birthDate).slice(0, 10);
      const match = (candidates || []).find((c: any) =>
        c.phone && normalizePhone(c.phone) === inputPhone && inputPhone.length >= 10 &&
        c.birth_date && String(c.birth_date).slice(0, 10) === inputBirth
      );

      if (!match) {
        await recordRecoverAttempt(supabaseAdmin, ip, idHash, false);
        // Genérico: não revela qual campo errou nem se o nome existe.
        return NextResponse.json(
          { error: 'Os dados não conferem com nenhum cadastro. Confira nome, telefone e data de nascimento — ou procure a secretaria.' },
          { status: 401 }
        );
      }

      // Verificação OK → resetar a senha via REST admin
      const authAdminUrl = `${supabaseUrl}/auth/v1/admin/users/${match.id}`;
      const authHeaders: Record<string, string> = {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json',
      };

      const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
        Promise.race([
          p,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`Supabase não respondeu em ${ms / 1000}s. Tente novamente.`)), ms)
          ),
        ]);

      let existingMeta: Record<string, unknown> = {};
      try {
        const getRes = await withTimeout(fetch(authAdminUrl, { method: 'GET', headers: authHeaders }), 7_000);
        if (getRes.ok) existingMeta = (await getRes.json()).user_metadata ?? {};
      } catch (e) {
        console.warn('[RECOVER] getUserById falhou (não-crítico):', e);
      }

      let putRes: Response;
      try {
        putRes = await withTimeout(
          fetch(authAdminUrl, {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({
              password: newPassword,
              email_confirm: true,
              user_metadata: { ...existingMeta, must_change_password: false },
            }),
          }),
          8_000
        );
      } catch (e: any) {
        console.error('[RECOVER] updateUserById timeout/falhou:', e);
        return NextResponse.json({ error: e.message || 'Tempo esgotado ao gravar senha.' }, { status: 503 });
      }

      if (!putRes.ok) {
        const errBody = await putRes.json().catch(() => ({}));
        const errMsg = errBody.msg ?? errBody.message ?? errBody.error_description ?? `HTTP ${putRes.status}`;
        console.error('[RECOVER] updateUserById failed:', putRes.status, errBody);
        return NextResponse.json({ error: `Falha ao gravar senha: ${errMsg}` }, { status: 500 });
      }

      await recordRecoverAttempt(supabaseAdmin, ip, idHash, true);
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
