
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function exportGroupedStudents() {
  const { data, error } = await supabase
    .from('profiles')
    .select('name, email, course')
    .eq('profile_type', 'student')
    .order('name');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const enem = data.filter(s => s.course === 'enem');
  const etec = data.filter(s => s.course === 'etec');

  console.log('--- ENEM ---');
  enem.forEach(s => console.log(`${s.name} | ${s.email}`));
  console.log('--- ETEC ---');
  etec.forEach(s => console.log(`${s.name} | ${s.email}`));
  console.log('--- COUNTS ---');
  console.log(`ENEM: ${enem.length}`);
  console.log(`ETEC: ${etec.length}`);
  console.log(`TOTAL: ${data.length}`);
}

exportGroupedStudents();
