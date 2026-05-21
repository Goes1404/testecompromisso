import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

async function refreshToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
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

    const { title, description, privacyStatus = 'unlisted', contentType, fileSize } = await request.json();

    const { data: tokenRecord, error: tokenErr } = await supabase
      .from('teacher_youtube_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (tokenErr || !tokenRecord) {
      return NextResponse.json(
        { error: 'YouTube não conectado. Conecte seu canal primeiro.' },
        { status: 400 }
      );
    }

    let accessToken: string = tokenRecord.access_token;

    // Refresh token if it expires within the next 2 minutes
    if (tokenRecord.token_expiry && new Date(tokenRecord.token_expiry) < new Date(Date.now() + 120_000)) {
      const refreshed = await refreshToken(tokenRecord.refresh_token);
      accessToken = refreshed.access_token;
      const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
      await supabase
        .from('teacher_youtube_tokens')
        .update({ access_token: accessToken, token_expiry: newExpiry, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
    }

    // Initiate YouTube resumable upload session
    const metadata = {
      snippet: {
        title,
        description: description || '',
        categoryId: '27', // Education
      },
      status: {
        privacyStatus,
        selfDeclaredMadeForKids: false,
      },
    };

    const uploadInitRes = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': contentType || 'video/*',
          ...(fileSize ? { 'X-Upload-Content-Length': String(fileSize) } : {}),
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!uploadInitRes.ok) {
      const errText = await uploadInitRes.text();
      throw new Error(`YouTube API error (${uploadInitRes.status}): ${errText}`);
    }

    const uploadUrl = uploadInitRes.headers.get('location');
    if (!uploadUrl) throw new Error('YouTube não retornou URL de upload');

    return NextResponse.json({ uploadUrl });
  } catch (err: any) {
    console.error('[YOUTUBE_START_UPLOAD]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
