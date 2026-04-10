
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim().replace(/^"(.*)"$/, '$1');
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const testStudents = [
  { name: 'Alan Henrique', school: 'Aldônio', type: 'enem' },
  { name: 'Alana G Costa Nogueira', school: 'Aldônio', type: 'enem' },
  { name: 'Alice Agami Koga', school: 'Carlos Alberto', type: 'enem' },
  { name: 'Alison Italo Ribeiro', school: 'Aldônio', type: 'enem' },
  { name: 'Alyson G de Oliveira', school: 'Mário Covas', type: 'enem' }
];

async function registerStudent(student) {
  const nameParts = student.name.trim().split(' ').filter(p => p.length > 0);
  const firstName = nameParts[0];
  const lastName = nameParts[nameParts.length - 1];
  
  let secondNameInitial = '';
  if (nameParts.length > 1) {
    secondNameInitial = nameParts[1][0].toLowerCase();
  }

  const emailPart = (firstName + secondNameInitial + lastName)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
  
  const email = `${emailPart}@compromisso.com`;
  const displayName = `${firstName} ${lastName}`;

  console.log(`🚀 Testando: ${displayName} <${email}>`);

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: "compromisso2026",
    email_confirm: true,
    user_metadata: {
      full_name: student.name,
      profile_type: 'student',
      exam_target: student.type,
      institution: student.school
    }
  });

  if (error) {
    console.error(`- ❌ Auth: ${error.message}`);
  } else {
    const userId = data.user.id;
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        name: student.name,
        email: email,
        profile_type: 'student',
        exam_target: student.type,
        institution: student.school,
        status: 'active'
      });
    if (profileError) console.error(`- ❌ Profile: ${profileError.message}`);
    else console.log(`- ✅ Sucesso!`);
  }
}

async function run() {
  console.log('Iniciando Teste Mini com 5 alunos...');
  for (const s of testStudents) {
    await registerStudent(s);
  }
  console.log('--- FIM DO TESTE ---');
}

run();
