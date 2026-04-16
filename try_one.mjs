
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

async function tryOne() {
    console.log('Trying to create Leonardo Ferreira Godoi again...');
    const { data, error } = await supabase.auth.admin.createUser({
        email: 'leonardofgodoi@compromisso.com',
        password: 'compromisso2026',
        email_confirm: true,
        user_metadata: { full_name: 'Leonardo Ferreira Godoi' }
    });
    if (error) {
        console.log('FAILED:', JSON.stringify(error, null, 2));
    } else {
        console.log('SUCCESS:', data.user.id);
    }
}

tryOne();
