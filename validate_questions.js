import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function validateQuestions() {
  console.log("=== INICIANDO AUDITORIA DE QUESTÕES GERADAS ===");
  
  // Pegar as últimas 60 questões criadas (as da AI)
  const { data: questions, error } = await supabase
    .from('questions')
    .select('*, subjects(name)')
    .order('created_at', { ascending: false })
    .limit(60);

  if (error) {
    return console.error("Erro ao puxar questões:", error);
  }

  let validCount = 0;
  let invalidCount = 0;
  let issues = [];

  for (const q of questions) {
    let isValid = true;
    let localIssues = [];

    // Checar texto base
    if (!q.question_text || q.question_text.length < 20) {
      isValid = false;
      localIssues.push(`Texto inválido ou curto (${q.question_text?.length} chars)`);
    }

    // Checar opções
    let opts = q.options;
    if (typeof opts === 'string') {
        try { opts = JSON.parse(opts); } catch(e) { opts = null; }
    }

    if (!Array.isArray(opts) || opts.length !== 5) {
      isValid = false;
      localIssues.push(`Opções inválidas (esperava 5, recebeu ${Array.isArray(opts) ? opts.length : 'não-array'})`);
    } else {
        // Checar se todas as opções têm key e text
        const hasAllKeys = opts.every(o => o.key && o.text);
        if (!hasAllKeys) {
            isValid = false;
            localIssues.push("Alternativas sem 'key' ou 'text'");
        }
    }

    // Checar correct_answer
    if (!q.correct_answer || !['A','B','C','D','E','a','b','c','d','e'].includes(q.correct_answer)) {
      isValid = false;
      localIssues.push(`Gabarito inválido: ${q.correct_answer}`);
    }

    if (isValid) {
      validCount++;
    } else {
      invalidCount++;
      issues.push(`Questão ID ${q.id} (${q.subjects?.name}): ${localIssues.join(' | ')}`);
    }
  }

  console.log(`Auditoria concluída em ${questions.length} questões.`);
  console.log(`✅ Válidas e Perfeitas: ${validCount}`);
  console.log(`❌ Com Problemas: ${invalidCount}`);
  
  if (invalidCount > 0) {
      console.log("\nProblemas Encontrados:");
      issues.forEach(i => console.log("- " + i));
  } else {
      console.log("\nA qualidade estrutural das questões geradas pela IA está IMPECÁVEL. 100% de precisão de formato e gabarito!");
  }
}

validateQuestions();
