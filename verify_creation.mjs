
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verify() {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'aluno@compromisso.com')
        .maybeSingle();

    if (error) {
        console.error("Error fetching profile:", error.message);
        return;
    }

    if (profile) {
        console.log("Profile found:", JSON.stringify(profile, null, 2));
    } else {
        console.log("Profile not found in 'profiles' table.");
    }

    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    const authUser = users.find(u => u.email === 'aluno@compromisso.com');
    if (authUser) {
        console.log("Auth User found:", JSON.stringify({
            id: authUser.id,
            email: authUser.email,
            user_metadata: authUser.user_metadata
        }, null, 2));
    } else {
        console.log("Auth User not found.");
    }
}

verify();
