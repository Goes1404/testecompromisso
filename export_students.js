
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function exportStudents() {
  const { data, error } = await supabase
    .from('profiles')
    .select('name, email')
    .eq('profile_type', 'student')
    .order('name');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('--- LISTA DE ALUNOS ---');
  data.forEach(s => {
    console.log(`${s.name} | ${s.email}`);
  });
  console.log('--- FIM DA LISTA ---');
  console.log(`Total: ${data.length} alunos.`);
}

exportStudents();
