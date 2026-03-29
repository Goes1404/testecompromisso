import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const subjects = [
  { id: "913a4e67-ba5b-4bd7-b553-388347fa836d", name: "Português" },
  { id: "f1ae4302-277f-4a79-bcb3-356e07dec260", name: "História" },
  { id: "8746ef47-005e-4336-a77d-a193656b18fa", name: "Geografia" },
  { id: "c76661b6-3b70-4130-90aa-67a2a7d173fb", name: "Biologia" },
  { id: "b0d17d51-d0fc-42ca-803e-e89b5fa97584", name: "Química" },
  { id: "be240ade-64b8-4210-89e3-b45b01655b92", name: "Física" },
  { id: "ec493d82-69a7-4c20-993b-de7cf77e27dd", name: "Filosofia" },
  { id: "5e6bd63a-bcdb-45cf-8df9-78330c872aff", name: "Sociologia" },
  { id: "00000000-0000-0000-0000-000000000008", name: "Inglês" },
  { id: "00000000-0000-0000-0000-000000000014", name: "Literatura" }
];

async function generateQuestionsForSubject(subjectId, subjectName, count = 50) {
  console.log(`\n🚀 Gerando ${count} questões para: ${subjectName}...`);
  
  let inserted = 0;
  const batchSize = 5;

  while (inserted < count) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é uma IA especialista em criar questões do ENEM. 
Crie questões de ${subjectName} com ALTO NÍVEL de complexidade.
Regras:
1. MODELO ENEM: Cada questão deve ter um Texto-base (fonte citada), um Enunciado provocativo e 5 Alternativas (A-E).
2. DISTRATORES: As alternativas erradas devem ser plausíveis mas incorretas.
3. SEM IMAGENS: Não faça referência a figuras.
4. FORMATO: Responda estritamente em JSON no seguinte formato:
{
  "questions": [
    {
      "question_text": "TEXTO BASE + ENUNCIADO",
      "options": [
         {"key": "a", "text": "..."},
         {"key": "b", "text": "..."},
         {"key": "c", "text": "..."},
         {"key": "d", "text": "..."},
         {"key": "e", "text": "..."}
      ],
      "correct_answer": "a",
      "year": 2024
    }
  ]
}`
          },
          {
            role: "user",
            content: `Gere ${batchSize} questões inéditas de ${subjectName} (padrão ENEM).`
          }
        ],
        response_format: { type: "json_object" }
      });

      const response = JSON.parse(completion.choices[0].message?.content || "{}");
      const list = response.questions || [];

      if (list.length > 0) {
        const toInsert = list.map(q => ({
          question_text: q.question_text,
          options: q.options,
          correct_answer: q.correct_answer.toUpperCase(),
          year: q.year,
          subject_id: subjectId
        }));

        const { error } = await supabase.from('questions').insert(toInsert);
        if (error) {
          console.error(`Erro no Supabase (${subjectName}):`, error.message);
        } else {
          inserted += list.length;
          console.log(`✅ [${subjectName}] ${inserted}/${count} inseridas.`);
        }
      }
    } catch (e) {
      console.error(`Falha em ${subjectName}:`, e.message);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function run() {
  for (const s of subjects) {
    await generateQuestionsForSubject(s.id, s.name, 50);
  }
  process.exit(0);
}

run();
