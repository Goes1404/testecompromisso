
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

async function checkCounts() {
    console.log('--- AUDITORIA DE USUÁRIOS ---');
    
    // 1. Check Profiles Table
    const { count: profileCount, error: profileError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('profile_type', 'student');
    
    console.log(`Alunos na tabela 'profiles': ${profileCount}`);
    
    // 2. Check Auth Users
    let page = 1;
    let authStudents = 0;
    let authOthers = 0;
    let authNoMetadata = 0;
    let totalAuth = 0;
    
    while (true) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({
            page,
            perPage: 1000
        });
        
        if (error || !users || users.length === 0) break;
        
        totalAuth += users.length;
        users.forEach(u => {
            const type = u.user_metadata?.profile_type;
            if (type === 'student') authStudents++;
            else if (!type) authNoMetadata++;
            else authOthers++;
        });
        
        page++;
    }
    
    console.log(`Total de usuários no Auth: ${totalAuth}`);
    console.log(`Alunos no Auth (com metadata): ${authStudents}`);
    console.log(`Usuários no Auth sem metadata: ${authNoMetadata}`);
    console.log(`Outros usuários (teachers/admin): ${authOthers}`);
    
    // 3. Check full_student_list_grouped.md
    if (fs.existsSync('full_student_list_grouped.md')) {
        const content = fs.readFileSync('full_student_list_grouped.md', 'utf8');
        const lines = content.split('\n').filter(l => l.includes('|') && !l.includes('Email') && !l.includes('---'));
        console.log(`Alunos no arquivo 'full_student_list_grouped.md': ${lines.length}`);
    }
}

checkCounts();
