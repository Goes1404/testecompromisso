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
  const raw = fs.readFileSync('students_data.json', 'utf8');
  const students = JSON.parse(raw);

  console.log(`🚀 Iniciando sincronização DEFINITIVA para ${students.length} alunos...`);

  // 1. Fetch ALL auth users across all pages to avoid pagination issues
  console.log("📥 Carregando todos os usuários do Supabase Auth para cache...");
  let allAuthUsers = [];
  let page = 1;
  let keepFetching = true;

  while (keepFetching) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page: page,
      perPage: 1000
    });
    if (error) {
      console.error("Error fetching users:", error);
      process.exit(1);
    }
    const { users } = data;
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
      const existing = allAuthUsers.find(u => u.email.toLowerCase() === s.email.toLowerCase());

      if (existing) {
        userId = existing.id;
        // Atualiza a senha e o metadata do aluno existente
        await supabase.auth.admin.updateUserById(userId, { 
          password: 'compromisso2026',
          user_metadata: { must_change_password: true, display_name: s.name }
        });
      } else {
        // Cria novo aluno se não houver
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
        // Adiciona ao cache
        allAuthUsers.push(userData.user);
      }

      if (userId) {
        // 2. Upsert Profile para garantir que os 718 alunos apareçam
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
        
        if (i % 50 === 0) console.log(`🔄 Progresso: ${i}/${students.length}`);
      }
    } catch (err) {
      console.error(`❌ Erro no aluno ${s.name} (${s.email}):`, err.message);
      failCount++;
    }
  }

  console.log(`\n🏁 Sincronização Concluída!`);
  console.log(`✅ Sucessos: ${successCount} | ❌ Falhas: ${failCount}`);
}

run();
