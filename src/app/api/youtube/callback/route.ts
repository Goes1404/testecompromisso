import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';
import { getAuthUser } from '@/lib/server-auth';

// Valida a assinatura HMAC do state emitido por /api/youtube/auth-url.
// Retorna o payload cru (base64url) se válido, ou null.
function verifyState(signed: string): string | null {
  const dot = signed.lastIndexOf('.');
  if (dot === -1) return null;
  const payload = signed.slice(0, dot);
  const sig = signed.slice(dot + 1);
  const secret = process.env.YOUTUBE_STATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const expected = createHmac('sha256', secret).update(payload).digest('hex').slice(0, 32);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return payload;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateRaw = searchParams.get('state');
  const oauthError = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://compromissose.com';

  if (oauthError || !code || !stateRaw) {
    return NextResponse.redirect(`${appUrl}/dashboard/teacher/trails?youtube=error`);
  }

  try {
    // Segurança: só aceita state assinado por nós E confere que o usuário logado
    // na sessão é o mesmo do state. Sem isso, um atacante forjaria o vínculo do
    // canal YouTube a outro professor (ou o próprio canal ao alvo).
    const verifiedPayload = verifyState(stateRaw);
    if (!verifiedPayload) {
      return NextResponse.redirect(`${appUrl}/dashboard/teacher/trails?youtube=error`);
    }
    const state = JSON.parse(Buffer.from(verifiedPayload, 'base64url').toString('utf8'));
    const { userId, trailId } = state as { userId: string; trailId: string };

    const sessionUser = await getAuthUser();
    if (!sessionUser || sessionUser.id !== userId) {
      return NextResponse.redirect(`${appUrl}/dashboard/teacher/trails?youtube=error`);
    }

    const redirectUri = `${appUrl}/api/youtube/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      throw new Error('Falha ao trocar código por tokens do Google');
    }

    const tokens = await tokenRes.json();

    // Get teacher's YouTube channel info
    const channelRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    const channelData = await channelRes.json();
    const channel = channelData.items?.[0];

    // Save tokens to DB using service role (bypasses RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const tokenExpiry = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    await supabaseAdmin.from('teacher_youtube_tokens').upsert(
      {
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: tokenExpiry,
        channel_id: channel?.id ?? null,
        channel_title: channel?.snippet?.title ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    const redirectTo = trailId
      ? `/dashboard/teacher/trails/${trailId}?youtube=connected`
      : `/dashboard/teacher/trails?youtube=connected`;

    return NextResponse.redirect(`${appUrl}${redirectTo}`);
  } catch (err: any) {
    console.error('[YOUTUBE_CALLBACK]', err);
    return NextResponse.redirect(`${appUrl}/dashboard/teacher/trails?youtube=error`);
  }
}
