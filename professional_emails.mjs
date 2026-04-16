
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

async function fixAllWithDotPattern() {
    const students = [
        { name: 'Leonardo Ferreira Godoi', current: 'leonardofgodoi_new@compromisso.com', target: 'leonardo.godoi@compromisso.com' },
        { name: 'Luiz Claudio', current: 'luizclaudio_new@compromisso.com', target: 'luiz.claudio@compromisso.com' },
        { name: 'Mathias de Godoi Nobre', current: 'mathiasgnobre_new@compromisso.com', target: 'mathias.nobre@compromisso.com' },
        { name: 'Kethellyn Gabrielly Fernandes', current: 'kethellyn.fernandes@compromisso.com', target: 'kethellyn.fernandes@compromisso.com' } // Already done
    ];

    console.log('--- PROFESSIONAL EMAIL REFACTOR ---');

    const { data: { users } } = await supabase.auth.admin.listUsers();

    for (const student of students) {
        console.log(`\nProcessing ${student.name}...`);
        
        // 1. Delete _new version if it exists
        const userToDelete = users.find(u => u.email === student.current);
        if (userToDelete && student.current !== student.target) {
            console.log(`Deleting ${student.current} (${userToDelete.id})...`);
            await supabase.auth.admin.deleteUser(userToDelete.id);
            await supabase.from('profiles').delete().eq('id', userToDelete.id);
        }

        // 2. Attempt to create TARGET (dot pattern)
        const targetUser = users.find(u => u.email === student.target);
        if (targetUser && student.current === student.target) {
            console.log(`${student.target} already exists and is healthy.`);
            continue;
        }

        console.log(`Creating ${student.target}...`);
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: student.target,
            password: 'compromisso2026',
            email_confirm: true,
            user_metadata: { full_name: student.name, role: 'student' }
        });

        if (authError) {
            console.error(`FAILED to create ${student.target}:`, authError.message);
            // Fallback: try adding another part of name
            if (student.name === 'Leonardo Ferreira Godoi') {
                 const fb = 'leonardo.ferreira@compromisso.com';
                 console.log(`Trying fallback: ${fb}`);
                 const { data: fbData, error: fbError } = await supabase.auth.admin.createUser({
                    email: fb,
                    password: 'compromisso2026',
                    email_confirm: true,
                    user_metadata: { full_name: student.name, role: 'student' }
                 });
                 if (!fbError) {
                    await supabase.from('profiles').upsert({ id: fbData.user.id, email: fb, full_name: student.name, role: 'student' });
                    console.log(`SUCCESS with ${fb}`);
                 }
            } else if (student.name === 'Mathias de Godoi Nobre') {
                 const fb = 'mathias.godoi@compromisso.com';
                 console.log(`Trying fallback: ${fb}`);
                 const { data: fbData, error: fbError } = await supabase.auth.admin.createUser({
                    email: fb,
                    password: 'compromisso2026',
                    email_confirm: true,
                    user_metadata: { full_name: student.name, role: 'student' }
                 });
                 if (!fbError) {
                    await supabase.from('profiles').upsert({ id: fbData.user.id, email: fb, full_name: student.name, role: 'student' });
                    console.log(`SUCCESS with ${fb}`);
                 }
            }
        } else {
            console.log(`SUCCESS! Created ${student.target}`);
            await supabase.from('profiles').upsert({ id: authData.user.id, email: student.target, full_name: student.name, role: 'student' });
        }
    }
}

fixAllWithDotPattern();
