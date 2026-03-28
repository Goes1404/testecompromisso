import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Carregar variáveis de ambiente do .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseServiceKey = env['SUPABASE_SERVICE_ROLE_KEY'];
const openaiKey = env['OPENAI_API_KEY'];

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateQuestionsForSubject(subjectName) {
  const url = `https://api.openai.com/v1/chat/completions`;
  const prompt = `Gere exatamente 4 questões inéditas estilo ENEM para a matéria de ${subjectName}. 
Responda EXCLUSIVAMENTE com um JSON object contendo a chave "questions" que mapeia para um array. Cada objeto do array deve ter este formato e chaves:
{
  "question_text": "Texto completo da questão, incluindo textos base",
  "options": [
    {"key": "A", "text": "texto da alternativa"},
    {"key": "B", "text": "texto da alternativa"},
    {"key": "C", "text": "texto da alternativa"},
    {"key": "D", "text": "texto da alternativa"},
    {"key": "E", "text": "texto da alternativa"}
  ],
  "correct_answer": "A",
  "year": 2024
}`;

  const payload = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Você é um gerador de questões que sempre responde com um objeto JSON válido contendo a chave "questions" mapeando para um array de questões.' }, 
      { role: 'user', content: prompt }
    ],
    temperature: 0.4,
    response_format: { type: "json_object" }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(data));
    
    let textResult = data.choices[0].message.content;
    const parsed = JSON.parse(textResult);
    return parsed.questions || parsed;
  } catch (e) {
    console.error(`Erro ao gerar questões para ${subjectName}:`, e.message);
    return null;
  }
}

async function run() {
  console.log("Iniciando geração de questões ENEM via OpenAI...");
  
  const { data: subjects, error: subjError } = await supabase.from('subjects').select('*');
  if (subjError) {
    return console.error("Erro ao buscar subjects:", subjError);
  }

  let hasTargetColumn = false;
  const { error: probeError } = await supabase.from('questions').select('target_audience').limit(1);
  if (!probeError) {
    hasTargetColumn = true;
    console.log("Coluna target_audience detectada. Usando 'enem'.");
  } else {
    console.log("Coluna target_audience não encontrada. Ignorando segmentação durante inserção.");
  }

  let teacherId = null;
  const { data: teachers } = await supabase.from('profiles').select('id').eq('profile_type', 'teacher').limit(1);
  if (teachers && teachers.length > 0) teacherId = teachers[0].id;
  
  let insertedTotal = 0;

  for (const subject of subjects) {
    console.log(`\n📚 Gerando questões de ${subject.name}...`);
    const qList = await generateQuestionsForSubject(subject.name);
    
    if (qList && Array.isArray(qList)) {
      const inserts = qList.map(q => {
        const row = {
          question_text: q.question_text,
          options: q.options,
          correct_answer: q.correct_answer,
          year: q.year || 2024,
          subject_id: subject.id,
          teacher_id: teacherId
        };
        if (hasTargetColumn) row.target_audience = 'enem';
        return row;
      });

      const { data, error } = await supabase.from('questions').insert(inserts).select();
      if (error) {
        console.error(`❌ Erro ao salvar questões de ${subject.name}:`, error.message);
      } else {
        console.log(`✅ ${inserts.length} questões de ${subject.name} salvas com sucesso!`);
        insertedTotal += inserts.length;
      }
    } else {
      console.log(`❌ Falha no parsing do JSON para ${subject.name}`);
    }
  }

  console.log(`\n🎉 Processo finalizado! Total de questões criadas: ${insertedTotal}`);
}

run();
