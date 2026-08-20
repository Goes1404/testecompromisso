import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/server-auth';
import { getBanca } from '@/lib/bancas';

export async function POST(request: Request) {
  try {
    // Segurança: a redação é sempre gravada para o usuário AUTENTICADO. Nunca
    // confiar no user_id do corpo (permitia lançar redação/nota para outro aluno).
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { theme, content, score, feedback, result_data, banca } = body;

    // A banca decide como o número em `score` deve ser lido (0-1000 no ENEM,
    // 0-50 na FUVEST). Valor inválido cai no ENEM em vez de gravar lixo.
    const bancaId = getBanca(banca).id;

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Bypassa o RLS e grava direto
    );

    const { data, error } = await supabaseAdmin
      .from('essay_submissions')
      .insert({
        user_id: user.id,
        theme,
        content,
        score,
        feedback,
        result_data,
        banca: bancaId,
        // `competencies` existe desde 20260525 com índice GIN e nunca foi
        // escrita — a UI sempre leu de dentro de `result_data`. Preencher aqui
        // torna a coluna consultável por SQL (média por critério, calibração)
        // sem ter que abrir o JSONB inteiro.
        competencies: result_data?.competencies ?? null,
      })
      .select('*')
      .single();

    if (error) {
      console.error("Supabase Admin Insert Error:", error);
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('API /essay-save Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
