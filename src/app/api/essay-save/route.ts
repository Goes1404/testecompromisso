import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, theme, content, score, feedback, result_data } = body;

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Bypassa o RLS e grava direto
    );

    const { data, error } = await supabaseAdmin
      .from('essay_submissions')
      .insert({
        user_id,
        theme,
        content,
        score,
        feedback,
        result_data
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
