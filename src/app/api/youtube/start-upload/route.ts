import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

async function doRefreshToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error('Falha ao renovar token do YouTube');
  return res.json();
}

// Returns a valid access token to the browser so it can initiate and
// execute the upload directly against the YouTube API (avoids CORS issues
// that occur when the server initiates the session but the browser uploads).
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { data: tokenRecord, error: tokenErr } = await supabase
      .from('teacher_youtube_tokens')
      .select('access_token, refresh_token, token_expiry')
      .eq('user_id', user.id)
      .single();

    if (tokenErr || !tokenRecord) {
      return NextResponse.json(
        { error: 'YouTube não conectado. Conecte seu canal primeiro.' },
        { status: 400 }
      );
    }

    let accessToken: string = tokenRecord.access_token;

    if (tokenRecord.token_expiry && new Date(tokenRecord.token_expiry) < new Date(Date.now() + 120_000)) {
      const refreshed = await doRefreshToken(tokenRecord.refresh_token);
      accessToken = refreshed.access_token;
      const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
      await supabase
        .from('teacher_youtube_tokens')
        .update({ access_token: accessToken, token_expiry: newExpiry, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
    }

    return NextResponse.json({ accessToken });
  } catch (err: any) {
    console.error('[YOUTUBE_GET_TOKEN]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
