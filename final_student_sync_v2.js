
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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
const STANDARD_PASSWORD = "compromisso2026";

async function runFinal() {
    console.log('--- INICIANDO VARREDURA FINAL (JS VERSION) ---');
    const content = fs.readFileSync('full_student_list_grouped.md', 'utf8');
    const lines = content.split('\n').filter(l => l.includes('|') && !l.includes('Email'));
    const studentsData = lines.map(l => {
        const parts = l.split('|').map(p => p.trim());
        if (parts.length < 3) return null;
        
        return {
            name: parts[1],
            email: parts[2],
            school: 'Colégio Colaço', // Default if missing
            type: 'enem' // Default if missing
        };
    }).filter(s => s && s.email && s.email.includes('@'));

    console.log(`Lote de ${studentsData.length} alunos carregado.`);

    // Pegamos os IDs de quem já existe para não ficar consultando no loop
    let allUsers = [];
    let page = 1;
    while(true) {
        const {data:{users}, error} = await supabase.auth.admin.listUsers({page, perPage:1000});
        if(!users || users.length === 0 || error) break;
        allUsers = allUsers.concat(users);
        page++;
    }
    const userMap = new Map(allUsers.map(u => [u.email.toLowerCase(), u.id]));

    for (const [index, student] of studentsData.entries()) {
        const { email, name, school, type } = student;
        const lowerEmail = email.toLowerCase();
        
        if (userMap.has(lowerEmail)) {
            const userId = userMap.get(lowerEmail);
            const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
                password: STANDARD_PASSWORD,
                user_metadata: {
                    full_name: name,
                    profile_type: 'student',
                    exam_target: type,
                    institution: school,
                    must_change_password: true
                }
            });
            if (updateError) console.error(`[${index + 1}] ❌ Erro Update ${email}: ${updateError.message}`);
            else console.log(`[${index + 1}] ✅ Atualizado: ${email}`);
        } else {
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email,
                password: STANDARD_PASSWORD,
                email_confirm: true,
                user_metadata: {
                    full_name: name,
                    profile_type: 'student',
                    exam_target: type,
                    institution: school,
                    must_change_password: true
                }
            });

            if (createError) {
                console.error(`[${index + 1}] ❌ Erro Criação ${email}: ${createError.message}`);
            } else {
                await supabase.from('profiles').upsert({
                    id: newUser.user.id,
                    name,
                    email,
                    profile_type: 'student',
                    exam_target: type,
                    institution: school,
                    status: 'active'
                });
                console.log(`[${index + 1}] ✨ Criado: ${email}`);
            }
        }
    }
    console.log('--- TODO O ACESSO ESTÁ LIBERADO ---');
}

runFinal();
