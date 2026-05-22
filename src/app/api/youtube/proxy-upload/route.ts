import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// Receives one chunk via FormData and forwards it to YouTube's resumable
// upload URL. Using FormData avoids binary MIME-type rejection at the
// Vercel edge that occurs when sending raw video/* bodies.
//
// FormData fields expected:
//   chunk            — the binary slice (Blob/File)
//   uploadUrl        — YouTube resumable upload URL (from start-upload)
//   contentRange     — e.g. "bytes 0-2097151/104857600"
//   videoContentType — MIME type of the original video file
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

    const form = await request.formData();
    const chunkFile = form.get('chunk') as File | null;
    const uploadUrl = form.get('uploadUrl') as string | null;
    const contentRange = form.get('contentRange') as string | null;
    const videoContentType = (form.get('videoContentType') as string | null) || 'video/mp4';

    if (!chunkFile || !uploadUrl || !contentRange) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes: chunk, uploadUrl, contentRange' },
        { status: 400 }
      );
    }

    const buffer = await chunkFile.arrayBuffer();

    const ytRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': videoContentType,
        'Content-Range': contentRange,
        'Content-Length': String(buffer.byteLength),
      },
      body: buffer,
    });

    // 308 Resume Incomplete — chunk accepted, YouTube wants more
    if (ytRes.status === 308) {
      const range = ytRes.headers.get('range'); // "bytes=0-2097151"
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
