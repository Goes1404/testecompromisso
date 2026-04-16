
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

async function createFinalTwo() {
    const students = [
        { name: 'Milena Farias', email: 'milena.farias@compromisso.com' },
        { name: 'Enzo Gabriel', email: 'enzo.gabriel@compromisso.com' }
    ];

    console.log('--- CREATING FINAL TWO STUDENTS ---');

    for (const student of students) {
        console.log(`\nCreating ${student.name} (${student.email})...`);
        
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: student.email,
            password: 'compromisso2026',
            email_confirm: true,
            user_metadata: {
                full_name: student.name,
                role: 'student',
                must_change_password: true
            }
        });

        if (authError) {
            console.error(`Auth Error for ${student.name}:`, authError.message);
            continue;
        }

        const userId = authData.user.id;
        console.log(`Auth user created: ${userId}`);

        const { error: pError } = await supabase.from('profiles').upsert({
            id: userId,
            email: student.email,
            full_name: student.name,
            role: 'student'
        });

        if (pError) {
            console.error(`Profile Error for ${student.name}:`, pError);
        } else {
            console.log(`Profile created and synced.`);
        }
    }
}

createFinalTwo();
