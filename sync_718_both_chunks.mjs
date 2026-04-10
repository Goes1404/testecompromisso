import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const data1 = fs.readFileSync('students_source_718.txt', 'utf8');
  let data2 = '';
  if (fs.existsSync('students_source_718_chunk_part2.txt')) {
      data2 = fs.readFileSync('students_source_718_chunk_part2.txt', 'utf8');
  }
  const data = data1 + '\n------------------------------\n' + data2;
  
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
    // Use an email deduplication logic just in case both files overlap
    if (student.name && student.email && !students.find(s => s.email === student.email)) {
       students.push(student);
    }
  }

  console.log(`🚀 Iniciando sincronização definitiva para ${students.length} alunos...`);
  
  // Fetch ALL auth users across all pages to avoid pagination issues
  console.log("📥 Carregando todos os usuários do Supabase Auth para cache...");
  let allAuthUsers = [];
  let page = 1;
  let keepFetching = true;

  while (keepFetching) {
    const { data: usersData, error } = await supabase.auth.admin.listUsers({
      page: page,
      perPage: 1000
    });
    if (error) {
      console.error("Error fetching users:", error);
      process.exit(1);
    }
    const { users } = usersData;
    if (users.length === 0) {
      keepFetching = false;
    } else {
      allAuthUsers = allAuthUsers.concat(users);
      page++;
    }
  }

  console.log(`✅ Carregados ${allAuthUsers.length} usuários do Auth.`);
  
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    try {
      let userId;
      const existing = allAuthUsers.find(u => u.email.toLowerCase() === s.email);

      if (existing) {
        userId = existing.id;
        // Update password just in case
        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, { 
          password: 'compromisso2026',
          user_metadata: { must_change_password: true, display_name: s.name }
        });
        if (updateError) {
           console.log(`Failed to update password for ${s.email}: ${updateError.message}`);
        }
      } else {
         const { data: userData, error: userError } = await supabase.auth.admin.createUser({
          email: s.email,
          password: 'compromisso2026',
          email_confirm: true,
          user_metadata: { must_change_password: true, display_name: s.name }
        });

        if (userError) {
           throw userError;
        }
        userId = userData.user.id;
        allAuthUsers.push(userData.user);
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
