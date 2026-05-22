import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// Proxies the video bytes from the browser to YouTube's resumable upload URL.
// This avoids CORS issues — the browser uploads to our same-origin route,
// and we forward to googleapis.com server-side (no CORS constraints).
export async function POST(request: Request) {
  try {
    // Verify auth
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const uploadUrl = request.headers.get('x-upload-url');
    if (!uploadUrl) return NextResponse.json({ error: 'Upload URL ausente' }, { status: 400 });

    const contentType = request.headers.get('content-type') || 'video/mp4';
    const contentLength = request.headers.get('content-length');

    // Stream the request body directly to YouTube (no buffering in memory)
    const ytRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        ...(contentLength ? { 'Content-Length': contentLength } : {}),
      },
      body: request.body,
      // @ts-ignore — required for streaming request body in Node 18+
      duplex: 'half',
    });

    if (!ytRes.ok) {
      const errText = await ytRes.text();
      throw new Error(`YouTube rejeitou o upload (${ytRes.status}): ${errText}`);
    }

    const result = await ytRes.json();
    if (!result.id) throw new Error('YouTube não retornou ID do vídeo');

    return NextResponse.json({ videoId: result.id });
  } catch (err: any) {
    console.error('[YOUTUBE_PROXY_UPLOAD]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
