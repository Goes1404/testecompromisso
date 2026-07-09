import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { verifyRegistrationToken } from '@/lib/registration-token';
import crypto from 'crypto';
import { generateResetToken, verifyResetToken } from '@/lib/password-reset-token';
import { sendOtpSms } from '@/lib/sms';

const SUPABASE_TIMEOUT_MS = 10_000;

const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60_000;

function generateOtpCode(): string {
  return String(crypto.randomInt(100000, 1000000));
}

function hashOtpCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `***-${digits.slice(-4)}`;
}

async function createAndSendOtp(admin: any, userId: string, phone: string) {
  const code = generateOtpCode();
  const codeHash = hashOtpCode(code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  await admin.from('password_reset_otps').insert({
    user_id: userId,
    code_hash: codeHash,
    expires_at: expiresAt,
  });

  await sendOtpSms(phone, code);
}

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

    // AÇÃO: IDENTIFICAR (passo 1 do wizard de recuperação por SMS)
    // Verifica nome+data de nascimento contra o cadastro (mesmo rate-limit de antes).
    // Se achar telefone cadastrado, já dispara o OTP. Senão, sinaliza needsPhone.
    if (action === 'identify') {
      const { fullName, birthDate } = body;

      if (!fullName?.trim() || !birthDate?.trim()) {
        return NextResponse.json({ error: 'Preencha nome e data de nascimento.' }, { status: 400 });
      }

      const ip = getClientIp(request);
      const idHash = hashIdentifier(fullName);

      if (await checkRecoverRateLimit(supabaseAdmin, ip, idHash)) {
        return NextResponse.json(
          { error: 'Muitas tentativas. Por segurança, aguarde 1 hora ou procure a secretaria.' },
          { status: 429 }
        );
      }

      const generatedEmail = generateEmail(fullName.trim());
      const safeName = fullName.trim().replace(/[,()*\\]/g, ' ').replace(/\s+/g, ' ').trim();
      const { data: candidates, error: searchErr } = await supabaseAdmin
        .from('profiles')
        .select('id, phone, birth_date')
        .or(`email.eq.${generatedEmail},name.ilike.%${safeName}%`)
        .limit(10);

      if (searchErr) {
        console.error('[IDENTIFY] erro na busca:', searchErr);
        throw searchErr;
      }

      const inputBirth = String(birthDate).slice(0, 10);
      const match = (candidates || []).find((c: any) =>
        c.birth_date && String(c.birth_date).slice(0, 10) === inputBirth
      );

      if (!match) {
        await recordRecoverAttempt(supabaseAdmin, ip, idHash, false);
        return NextResponse.json(
          { error: 'Os dados não conferem com nenhum cadastro. Confira nome e data de nascimento — ou procure a secretaria.' },
          { status: 401 }
        );
      }

      await recordRecoverAttempt(supabaseAdmin, ip, idHash, true);
      const resetToken = generateResetToken(match.id);

      if (!match.phone) {
        return NextResponse.json({ resetToken, needsPhone: true });
      }

      try {
        await createAndSendOtp(supabaseAdmin, match.id, match.phone);
      } catch (e: any) {
        console.error('[IDENTIFY] falha ao enviar SMS (code):', e?.code ?? 'unknown');
        return NextResponse.json({ error: 'Não foi possível enviar o SMS agora. Tente novamente.' }, { status: 503 });
      }

      return NextResponse.json({ resetToken, maskedPhone: maskPhone(match.phone) });
    }

    // AÇÃO: CADASTRAR TELEFONE (passo 1b, só quando needsPhone)
    if (action === 'set-phone') {
      const { resetToken, phone } = body;
      const verified = verifyResetToken(resetToken);
      if (verified.status !== 'valid') {
        return NextResponse.json({ error: 'Sessão de recuperação expirada. Reinicie o processo.' }, { status: 401 });
      }

      // Anti-takeover: só permite cadastrar telefone se a conta ainda não tiver um.
      // Caso contrário, um atacante que soubesse nome+data de nascimento da vítima
      // poderia sobrescrever o telefone dela com o próprio e assumir a conta.
      const { data: currentProfile } = await supabaseAdmin
        .from('profiles').select('phone').eq('id', verified.userId).maybeSingle();
      if (currentProfile?.phone) {
        return NextResponse.json({ error: 'Sessão de recuperação expirada. Reinicie o processo.' }, { status: 401 });
      }

      if (!phone?.trim() || phone.replace(/\D/g, '').length < 10) {
        return NextResponse.json({ error: 'Informe um telefone válido com DDD.' }, { status: 400 });
      }

      const { error: updateErr } = await supabaseAdmin
        .from('profiles')
        .update({ phone: phone.trim() })
        .eq('id', verified.userId);
      if (updateErr) {
        console.error('[SET_PHONE] erro ao salvar telefone:', updateErr);
        throw updateErr;
      }

      try {
        await createAndSendOtp(supabaseAdmin, verified.userId, phone.trim());
      } catch (e: any) {
        console.error('[SET_PHONE] falha ao enviar SMS (code):', e?.code ?? 'unknown');
        return NextResponse.json({ error: 'Não foi possível enviar o SMS agora. Tente novamente.' }, { status: 503 });
      }

      return NextResponse.json({ maskedPhone: maskPhone(phone.trim()) });
    }

    // AÇÃO: REENVIAR CÓDIGO
    if (action === 'resend') {
      const { resetToken } = body;
      const verified = verifyResetToken(resetToken);
      if (verified.status !== 'valid') {
        return NextResponse.json({ error: 'Sessão de recuperação expirada. Reinicie o processo.' }, { status: 401 });
      }

      const { data: profile } = await supabaseAdmin
        .from('profiles').select('phone').eq('id', verified.userId).maybeSingle();
      if (!profile?.phone) {
        return NextResponse.json({ error: 'Telefone não encontrado. Reinicie o processo.' }, { status: 400 });
      }

      const { data: lastOtp } = await supabaseAdmin
        .from('password_reset_otps')
        .select('created_at')
        .eq('user_id', verified.userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastOtp && Date.now() - new Date(lastOtp.created_at).getTime() < OTP_RESEND_COOLDOWN_MS) {
        return NextResponse.json({ error: 'Aguarde um pouco antes de reenviar o código.' }, { status: 429 });
      }

      try {
        await createAndSendOtp(supabaseAdmin, verified.userId, profile.phone);
      } catch (e: any) {
        console.error('[RESEND] falha ao enviar SMS (code):', e?.code ?? 'unknown');
        return NextResponse.json({ error: 'Não foi possível enviar o SMS agora. Tente novamente.' }, { status: 503 });
      }

      return NextResponse.json({ maskedPhone: maskPhone(profile.phone) });
    }

    // AÇÃO: CONFIRMAR CÓDIGO E TROCAR SENHA (passo final)
    if (action === 'confirm') {
      const { resetToken, code, newPassword } = body;
      const verified = verifyResetToken(resetToken);
      if (verified.status !== 'valid') {
        return NextResponse.json({ error: 'Sessão de recuperação expirada. Reinicie o processo.' }, { status: 401 });
      }
      if (!code?.trim() || !newPassword || newPassword.length < 8) {
        return NextResponse.json({ error: 'Informe o código e uma senha com pelo menos 8 caracteres.' }, { status: 400 });
      }

      const { data: otp } = await supabaseAdmin
        .from('password_reset_otps')
        .select('id, code_hash, expires_at, attempts, consumed')
        .eq('user_id', verified.userId)
        .eq('consumed', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!otp) {
        return NextResponse.json({ error: 'Código incorreto.' }, { status: 401 });
      }
      if (new Date(otp.expires_at).getTime() < Date.now()) {
        return NextResponse.json({ error: 'Código expirado. Solicite um novo.' }, { status: 400 });
      }
      if (otp.attempts >= OTP_MAX_ATTEMPTS) {
        return NextResponse.json({ error: 'Muitas tentativas erradas. Reinicie o processo.' }, { status: 429 });
      }

      const inputHash = hashOtpCode(code.trim());
      if (inputHash !== otp.code_hash) {
        await supabaseAdmin.from('password_reset_otps').update({ attempts: otp.attempts + 1 }).eq('id', otp.id);
        return NextResponse.json({ error: 'Código incorreto.' }, { status: 401 });
      }

      const authAdminUrl = `${supabaseUrl}/auth/v1/admin/users/${verified.userId}`;
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
        console.warn('[CONFIRM] getUserById falhou (não-crítico):', e);
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
        console.error('[CONFIRM] updateUserById timeout/falhou:', e);
        return NextResponse.json({ error: e.message || 'Tempo esgotado ao gravar senha.' }, { status: 503 });
      }

      if (!putRes.ok) {
        const errBody = await putRes.json().catch(() => ({}));
        const errMsg = errBody.msg ?? errBody.message ?? errBody.error_description ?? `HTTP ${putRes.status}`;
        console.error('[CONFIRM] updateUserById failed:', putRes.status, errBody);
        return NextResponse.json({ error: `Falha ao gravar senha: ${errMsg}` }, { status: 500 });
      }

      await supabaseAdmin.from('password_reset_otps').update({ consumed: true }).eq('id', otp.id);
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
