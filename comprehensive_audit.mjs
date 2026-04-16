import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^"(.*)"$/, '$1');
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('--- AUDITORIA COMPLETA ---');
    
    // 1. Get all students from profiles
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('email, profile_type, role')
        .eq('profile_type', 'student');
        
    console.log(`Estudantes no DB (profiles): ${profiles?.length || 0}`);
    
    // 2. Get all users from Auth
    let authUsers = [];
    let page = 1;
    while(true) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (error || !users || users.length === 0) break;
        authUsers = authUsers.concat(users);
        page++;
    }
    const studentAuth = authUsers.filter(u => u.user_metadata?.profile_type === 'student');
    console.log(`Estudantes no Auth: ${studentAuth.length}`);
    console.log(`Total de usuários no Auth: ${authUsers.length}`);

    // 3. Count in source files
    const file718 = fs.readFileSync('students_source_718.txt', 'utf8');
    const names718 = file718.match(/NOME:/g)?.length || 0;
    
    let namesPart2 = 0;
    if (fs.existsSync('students_source_718_chunk_part2.txt')) {
        const filePart2 = fs.readFileSync('students_source_718_chunk_part2.txt', 'utf8');
        namesPart2 = filePart2.match(/NOME:/g)?.length || 0;
    }
    
    console.log(`Nomes no students_source_718.txt: ${names718}`);
    console.log(`Nomes no students_source_718_chunk_part2.txt: ${namesPart2}`);
    console.log(`Total em arquivos 'source_718': ${names718 + namesPart2}`);

    // 4. Count in grouped markdown
    const mdContent = fs.readFileSync('full_student_list_grouped.md', 'utf8');
    const mdLines = mdContent.split('\n').filter(l => l.includes('|') && !l.includes('Nome') && !l.includes('---'));
    console.log(`Alunos no full_student_list_grouped.md: ${mdLines.length}`);

    // 5. Count in recreate scripts
    const rec1 = fs.readFileSync('recreate_students_1.mjs', 'utf8');
    const rec1Lines = rec1.split('const rawData = `')[1].split('`;')[0].trim().split('\n').length;
    
    const rec2 = fs.readFileSync('recreate_students_2.mjs', 'utf8');
    const rec2Lines = rec2.split('const rawData = `')[1].split('`;')[0].trim().split('\n').length;
    
    console.log(`Alunos no recreate_students_1: ${rec1Lines}`);
    console.log(`Alunos no recreate_students_2: ${rec2Lines}`);
    console.log(`Total em 'recreate' scripts: ${rec1Lines + rec2Lines}`);
}

run();
