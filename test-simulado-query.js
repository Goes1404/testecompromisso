import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSimulado() {
  console.log("Testando fetch de questões de Matemática...");
  const { data: subjects } = await supabase.from('subjects').select('id, name').eq('name', 'Matemática');
  const subjectId = subjects[0]?.id;

  if (!subjectId) return console.error("Subject não encontrado");

  // Query exata usada no front
  let query = supabase
      .from('questions')
      .select(`*, subjects(name)`)
      .eq('subject_id', subjectId)
      .limit(200);

  // Sem target_audience e com target_audience  
  query = query.or('target_audience.eq.all,target_audience.is.null');

  const { data, error } = await query;
  console.log("RESULTADO QUERY 1:");
  console.log("Error:", error);
  console.log("Data count:", data?.length);

  if (error && error.message.includes('target_audience')) {
      console.log("⚠️ Fallback acionado!");
      const fallback = await supabase
          .from('questions')
          .select(`*, subjects(name)`)
          .eq('subject_id', subjectId)
          .limit(200);
      console.log("RESULTADO FALLBACK:");
      console.log("Error:", fallback.error);
      console.log("Data count:", fallback.data?.length);
      console.log("Amostra Questão:", JSON.stringify(fallback.data?.[0], null, 2));
  }
}

testSimulado();
