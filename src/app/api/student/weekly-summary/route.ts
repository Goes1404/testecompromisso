import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const toISODate = (d: Date) => d.toISOString().split('T')[0];

function getWeekStart(): string {
  // segunda-feira da semana atual
  const d = new Date();
  const day = d.getDay(); // 0=dom, 1=seg...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return toISODate(d);
}

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Configuração do servidor incompleta.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const weekStart = getWeekStart();

    // Se já existe resumo desta semana, retorna ele
    const { data: existing } = await supabase
      .from('weekly_summaries')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, cached: true, summary: existing });
    }

    // Coleta métricas da semana
    const weekStartDate = new Date(weekStart);
    const weekStartISO = weekStartDate.toISOString();

    const [answersRes, essaysRes, examsRes, journalRes, profileRes] = await Promise.all([
      supabase
        .from('student_question_answers')
        .select('is_correct, created_at, questions(subject_id, subjects(name))')
        .eq('student_id', userId)
        .gte('created_at', weekStartISO),
      supabase
        .from('essay_submissions')
        .select('score, created_at')
        .eq('user_id', userId)
        .gte('created_at', weekStartISO),
      supabase
        .from('exam_attempts')
        .select('score, completed_at')
        .eq('user_id', userId)
        .gte('completed_at', weekStartISO),
      supabase
        .from('study_journal_entries')
        .select('mood, what_studied, hours_studied, entry_date')
        .eq('user_id', userId)
        .gte('entry_date', weekStart),
      supabase
        .from('profiles')
        .select('name, exam_target')
        .eq('id', userId)
        .maybeSingle(),
    ]);

    const answers = answersRes.data ?? [];
    const essays = essaysRes.data ?? [];
    const exams = examsRes.data ?? [];
    const journal = journalRes.data ?? [];
    const profile = profileRes.data;

    const totalAnswered = answers.length;
    const correct = answers.filter((a: any) => a.is_correct).length;
    const accuracy = totalAnswered > 0 ? Math.round((correct / totalAnswered) * 100) : 0;

    // Acerto por matéria
    const bySubject: Record<string, { correct: number; total: number }> = {};
    for (const a of answers as any[]) {
      const subjName = a.questions?.subjects?.name ?? 'Sem matéria';
      bySubject[subjName] ??= { correct: 0, total: 0 };
      bySubject[subjName].total += 1;
      if (a.is_correct) bySubject[subjName].correct += 1;
    }
    const subjectStats = Object.entries(bySubject).map(([name, s]) => ({
      name,
      accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      total: s.total,
    })).sort((a, b) => a.accuracy - b.accuracy);

    const weakestSubjects = subjectStats.slice(0, 3);
    const essayAvg = essays.length > 0 ? Math.round(essays.reduce((s, e: any) => s + (e.score ?? 0), 0) / essays.length) : 0;
    const examAvg = exams.length > 0 ? Math.round(exams.reduce((s, e: any) => s + (e.score ?? 0), 0) / exams.length) : 0;

    const metrics = {
      totalAnswered,
      correct,
      accuracy,
      essaysCount: essays.length,
      essayAvg,
      examsCount: exams.length,
      examAvg,
      journalEntries: journal.length,
      weakestSubjects,
      examTarget: profile?.exam_target ?? 'ENEM',
    };

    // Gera o resumo com IA
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `Você é Aurora, mentora educacional da plataforma Compromisso 360 (cursinho ENEM/ETEC).
Gere um resumo semanal motivacional e estratégico para o aluno **${profile?.name ?? 'Estudante'}** (foco: ${metrics.examTarget}).

Métricas da semana:
- Questões respondidas: ${totalAnswered} (${accuracy}% de acerto)
- Redações enviadas: ${essays.length} (média ${essayAvg})
- Simulados/Provas: ${exams.length} (média ${examAvg})
- Dias com diário registrado: ${journal.length}/7
- Matérias mais fracas: ${weakestSubjects.map(s => `${s.name} (${s.accuracy}%)`).join(', ') || 'sem dados'}

Retorne um JSON com:
{
  "summary": "Texto motivacional de 3-4 parágrafos curtos (use 2ª pessoa, tom acolhedor), destacando conquistas e oportunidades. Use markdown leve.",
  "recommendations": [
    { "icon": "🎯", "title": "Foco principal", "description": "..." },
    { "icon": "📚", "title": "...", "description": "..." },
    { "icon": "⚡", "title": "...", "description": "..." }
  ]
}

3 recomendações no máximo. Concretas e específicas. Se a semana foi pouco produtiva, motive sem julgar.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é Aurora, mentora educacional empática. Sempre responda em português do Brasil, em JSON estrito.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    const aiResult = JSON.parse(completion.choices[0].message?.content ?? '{}');

    const summaryText: string = aiResult.summary ?? 'Continue firme nos estudos!';
    const recommendations = aiResult.recommendations ?? [];

    // Persiste
    const { data: saved, error: saveError } = await supabase
      .from('weekly_summaries')
      .insert({
        user_id: userId,
        week_start: weekStart,
        summary: summaryText,
        metrics,
        recommendations,
      })
      .select()
      .single();

    if (saveError) {
      // Mesmo se falhar persistência, devolve o resumo gerado
      return NextResponse.json({
        success: true,
        cached: false,
        summary: { week_start: weekStart, summary: summaryText, metrics, recommendations },
      });
    }

    return NextResponse.json({ success: true, cached: false, summary: saved });
  } catch (error: any) {
    console.error('[WEEKLY_SUMMARY]', error);
    return NextResponse.json(
      { error: error.message ?? 'Erro ao gerar resumo semanal' },
      { status: 500 }
    );
  }
}
