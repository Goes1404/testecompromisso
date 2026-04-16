
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

async function finalAttempt() {
    const students = [
        { name: 'Leonardo Ferreira Godoi', email: 'leonardofgodoi_new@compromisso.com' },
        { name: 'Luiz Claudio', email: 'luizclaudio_new@compromisso.com' },
        { name: 'Mathias de Godoi Nobre', email: 'mathiasgnobre_new@compromisso.com' }
    ];

    for (const student of students) {
        console.log(`Trying specialized create for: ${student.name}`);
        const { data, error } = await supabase.auth.admin.createUser({
            email: student.email,
            password: 'compromisso2026',
            email_confirm: true,
            user_metadata: { full_name: student.name, role: 'student', must_change_password: true }
        });
        if (error) {
            console.error(`Failed ${student.email}:`, error);
        } else {
            console.log(`Success ${student.email}: ${data.user.id}`);
            await supabase.from('profiles').upsert({
                id: data.user.id,
                email: student.email,
                full_name: student.name,
                role: 'student',
                institution: 'ETEC',
                exam_target: 'ENEM',
                status: 'active'
            });
        }
    }
}

finalAttempt();
