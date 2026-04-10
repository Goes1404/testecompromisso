import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const data = fs.readFileSync('students_source_718.txt', 'utf8');
  const sections = data.split('------------------------------');
  const students = [];

  for (const section of sections) {
    const lines = section.trim().split('\n');
    const student = {};
    lines.forEach(line => {
      if (line.startsWith('NOME:')) student.name = line.replace('NOME:', '').trim();
      if (line.startsWith('EMAIL:')) student.email = line.replace('EMAIL:', '').trim().toLowerCase();
      if (line.startsWith('ESCOLA:')) student.institution = line.replace('ESCOLA:', '').trim();
      if (line.startsWith('OBJETIVO:')) student.exam_target = line.replace('OBJETIVO:', '').trim();
    });
    if (student.name && student.email) students.push(student);
  }

  console.log(`🚀 Iniciando sincronização definitiva para ${students.length} alunos...`);
  
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    try {
      // 1. Check/Create Auth
      let userId;
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: s.email,
        password: 'compromisso2026',
        email_confirm: true,
        user_metadata: { must_change_password: true, display_name: s.name }
      });

      if (userError) {
        if (userError.message.includes('already registered')) {
          // Get existing user ID
          const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
          const existing = users.find(u => u.email.toLowerCase() === s.email);
          if (existing) {
            userId = existing.id;
            // Update password just in case
            await supabase.auth.admin.updateUserById(userId, { 
              password: 'compromisso2026',
              user_metadata: { must_change_password: true, display_name: s.name }
            });
          }
        } else {
          throw userError;
        }
      } else {
        userId = userData.user.id;
      }

      if (userId) {
        // 2. Upsert Profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            email: s.email,
            name: s.name,
            institution: s.institution,
            exam_target: s.exam_target,
            profile_type: 'student',
            status: 'active',
            updated_at: new Date()
          });

        if (profileError) throw profileError;
        successCount++;
        if (i % 50 === 0) console.log(`✅ Progresso: ${i}/${students.length}`);
      }
    } catch (err) {
      console.error(`❌ Erro em ${s.name} (${s.email}):`, err.message);
      failCount++;
    }
  }

  console.log(`\n🏁 Sincronização Concluída!`);
  console.log(`✅ Sucessos: ${successCount}`);
  console.log(`❌ Falhas: ${failCount}`);
  console.log(`Total esperado: ${students.length}`);
}

run();
