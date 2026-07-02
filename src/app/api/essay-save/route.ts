import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/server-auth';

export async function POST(request: Request) {
  try {
    // Segurança: o dono da redação é SEMPRE o usuário autenticado da sessão.
    // Nunca confiar em user_id vindo do cliente (evita IDOR / forja de nota).
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { theme, content, score, feedback, result_data } = body;

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Bypassa o RLS e grava direto
    );

    const { data, error } = await supabaseAdmin
      .from('essay_submissions')
      .insert({
        user_id: authUser.id,
        theme,
        content,
        score,
        feedback,
        result_data
      })
      .select('*')
      .single();

    if (error) {
      console.error("Supabase Admin Insert Error");
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('API /essay-save Error');
    return NextResponse.json({ success: false, error: 'Falha ao salvar' }, { status: 500 });
  }
}
