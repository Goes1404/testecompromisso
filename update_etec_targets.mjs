
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

async function updateExamTargets() {
    const students = [
        { email: 'luiz.claudio@compromisso.com', target: 'ETEC' },
        { email: 'leonardo.godoi@compromisso.com', target: 'ETEC' },
        { email: 'kethellyn.fernandes@compromisso.com', target: 'ETEC' }
    ];

    console.log('--- UPDATING EXAM TARGETS TO ETEC ---');

    for (const student of students) {
        console.log(`Updating ${student.email}...`);
        
        // Update Profiles table
        const { error: pError } = await supabase
            .from('profiles')
            .update({ exam_target: student.target })
            .ilike('email', student.email);

        if (pError) {
            console.error(`Profile update error for ${student.email}:`, pError);
        } else {
            console.log(`Profile updated to ${student.target}.`);
        }

        // Also update Auth metadata if applicable
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const user = users.find(u => u.email.toLowerCase() === student.email.toLowerCase());
        
        if (user) {
            const { error: aError } = await supabase.auth.admin.updateUserById(user.id, {
                user_metadata: { ...user.user_metadata, exam_target: student.target }
            });
            if (aError) console.error(`Auth update error for ${student.email}:`, aError);
            else console.log(`Auth metadata updated.`);
        }
    }
}

updateExamTargets();
