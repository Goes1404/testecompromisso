import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// Receives one chunk from the browser and forwards it to YouTube's resumable
// upload URL using the correct Content-Range header. Each chunk is ≤5 MB so
// it stays well under Vercel's request body limit for any plan.
//
// Request headers expected:
//   x-upload-url   — YouTube resumable upload URL (from start-upload)
//   x-content-range — e.g. "bytes 0-5242879/104857600"
//   content-type   — video MIME type
//
// Response:
//   { done: false, nextByte: N }   — chunk accepted, more to go (YouTube 308)
//   { done: true,  videoId: "…" }  — upload complete (YouTube 200/201)
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const uploadUrl   = request.headers.get('x-upload-url');
    const contentRange = request.headers.get('x-content-range');
    const contentType  = request.headers.get('content-type') || 'video/mp4';

    if (!uploadUrl || !contentRange) {
      return NextResponse.json({ error: 'Headers x-upload-url e x-content-range são obrigatórios' }, { status: 400 });
    }

    const ytRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Range': contentRange,
      },
      body: request.body,
      // @ts-ignore — enables streaming without buffering in Node 18+
      duplex: 'half',
    });

    // 308 Resume Incomplete — chunk accepted, YouTube wants more
    if (ytRes.status === 308) {
      const range = ytRes.headers.get('range'); // "bytes=0-5242879"
      const nextByte = range ? parseInt(range.split('-')[1]) + 1 : 0;
      return NextResponse.json({ done: false, nextByte });
    }

    // 200 / 201 — upload complete
    if (ytRes.status === 200 || ytRes.status === 201) {
      const result = await ytRes.json();
      if (!result.id) throw new Error('YouTube não retornou ID do vídeo');
      return NextResponse.json({ done: true, videoId: result.id });
    }

    const errText = await ytRes.text();
    throw new Error(`YouTube rejeitou o chunk (${ytRes.status}): ${errText}`);
  } catch (err: any) {
    console.error('[YOUTUBE_PROXY_UPLOAD]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
