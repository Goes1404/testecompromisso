import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);
const openaiKey = env['OPENAI_API_KEY'];

const ENEM_PROMPT = (subjectName, count) => `Você é um elaborador de provas do ENEM (Exame Nacional do Ensino Médio). 
Gere exatamente ${count} questões INÉDITAS de ${subjectName} no padrão REAL do ENEM 2024.

REGRAS OBRIGATÓRIAS — cada questão PRECISA ter:

1. **TEXTO-BASE CONTEXTUALIZADO** (obrigatório): Cada questão deve começar com um texto motivador de no mínimo 80 palavras. Pode ser:
   - Um trecho de reportagem (ex: "Segundo dados do IBGE de 2023, ...")
   - Uma citação acadêmica (ex: "De acordo com o filósofo Zygmunt Bauman, ...")
   - Dados estatísticos descritos (ex: "A tabela a seguir mostra a evolução da taxa de desemprego no Brasil entre 2019 e 2023: ...")  
   - Um excerto literário, musical ou artístico
   - Uma descrição de situação-problema real

2. **ENUNCIADO PROBLEMATIZADOR**: Após o texto-base, uma pergunta que exija interpretação, análise crítica ou aplicação de conceitos. Nunca perguntas diretas de memorização.

3. **5 ALTERNATIVAS (A a E)** com distratores plausíveis. Cada alternativa deve ter no mínimo 15 palavras. Evite alternativas óbvias ou absurdas.

4. **GABARITO**: Uma única letra (A, B, C, D ou E).

5. **ANO**: 2024

Responda EXCLUSIVAMENTE com um JSON object contendo a chave "questions" que mapeia para um array. Cada objeto do array deve ter:
{
  "question_text": "TEXTO-BASE + ENUNCIADO (tudo junto, separado por \\n\\n)",
  "options": [
    {"key": "A", "text": "texto da alternativa A com no mínimo 15 palavras"},
    {"key": "B", "text": "texto da alternativa B"},
    {"key": "C", "text": "texto da alternativa C"},
    {"key": "D", "text": "texto da alternativa D"},
    {"key": "E", "text": "texto da alternativa E"}
  ],
  "correct_answer": "B",
  "year": 2024
}

IMPORTANTE: NÃO gere questões superficiais. Cada questão deve parecer que foi retirada de uma prova real do ENEM.`;

async function generateChunk(subjectName, chunkSize, index) {
  console.log(`[Lote ${index}] Pedindo ${chunkSize} questões de ${subjectName} para a OpenAI...`);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você é um especialista em elaboração de provas do ENEM com 20 anos de experiência. Responde apenas com JSON.' }, 
          { role: 'user', content: ENEM_PROMPT(subjectName, chunkSize) }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(data));
    
    const parsed = JSON.parse(data.choices[0].message.content);
    return parsed.questions || parsed;
  } catch (e) {
    console.error(`[Lote ${index}] Erro OpenAI:`, e.message);
    return null;
  }
}

async function run() {
  console.log("=== GERAÇÃO DE QUESTÕES PADRÃO ENEM REAL ===\n");
  
  const { data: subjects } = await supabase.from('subjects').select('*').ilike('name', 'Matemática').limit(1);
  if (!subjects?.length) return console.error("Matéria Matemática não encontrada.");
  const mathSubject = subjects[0];

  let teacherId = null;
  const { data: teachers } = await supabase.from('profiles').select('id').eq('profile_type', 'teacher').limit(1);
  if (teachers?.length) teacherId = teachers[0].id;

  let insertedTotal = 0;
  // 5 chunks de 10 = 50 questões com enunciados longos (o limite do gpt-4o-mini suporta ~10 questões longas por vez)
  const chunks = [10, 10, 10, 10, 10];

  for (let i = 0; i < chunks.length; i++) {
    const qList = await generateChunk('Matemática e suas Tecnologias', chunks[i], i + 1);
    
    if (qList && Array.isArray(qList)) {
      // Validação de qualidade: rejeitar questões com enunciados curtos
      const validQuestions = qList.filter(q => {
        if (!q.question_text || q.question_text.length < 150) {
          console.warn(`  ⚠️ Questão rejeitada por enunciado curto (${q.question_text?.length} chars)`);
          return false;
        }
        if (!Array.isArray(q.options) || q.options.length !== 5) {
          console.warn(`  ⚠️ Questão rejeitada: alternativas inválidas`);
          return false;
        }
        return true;
      });

      const inserts = validQuestions.map(q => ({
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
        year: q.year || 2024,
        subject_id: mathSubject.id,
        teacher_id: teacherId
      }));

      if (inserts.length > 0) {
        const { error } = await supabase.from('questions').insert(inserts);
        if (error) {
          console.error(`[Lote ${i+1}] ❌ Erro ao salvar:`, error.message);
        } else {
          console.log(`[Lote ${i+1}] ✅ ${inserts.length} questões salvas! (${validQuestions.length}/${qList.length} passaram na validação)`);
          insertedTotal += inserts.length;
        }
      }
    } else {
      console.error(`[Lote ${i+1}] ❌ Falha no parsing.`);
    }
  }

  console.log(`\n🎉 FINALIZADO! Total inserido: ${insertedTotal} questões de Matemática (padrão ENEM real).`);
}

run();
