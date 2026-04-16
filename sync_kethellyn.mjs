
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

async function syncProfile() {
    const userId = '72ac39c3-ef83-4825-bceb-28601b1f6a4f';
    const email = 'kethellyngfernandes_new@compromisso.com';
    const fullName = 'Kethellyn Gabrielly Fernandes';

    console.log(`Syncing profile for ${fullName} (${email})...`);
    
    const { error: pError } = await supabase.from('profiles').upsert({
        id: userId,
        email: email,
        full_name: fullName,
        role: 'student'
    });

    if (pError) {
        console.error('Profile sync FAILED:', pError);
    } else {
        console.log('Profile synced successfully.');
    }
}

syncProfile();
