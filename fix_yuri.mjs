
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

async function fixYuri() {
    const email = 'yuritmendes@compromisso.com';
    const userId = '7d42640b-2017-4d10-997c-22d6ee4df10a';
    const target = 'ETEC';

    console.log(`Fixing account for Yuri (${email})...`);

    // 1. Update Password and Metadata in Auth
    const { error: aError } = await supabase.auth.admin.updateUserById(userId, {
        password: 'compromisso2026',
        user_metadata: { 
            full_name: 'Yuri T Mendes',
            role: 'student',
            must_change_password: true,
            exam_target: target
        }
    });

    if (aError) {
        console.error('Auth update FAILED:', aError);
    } else {
        console.log('Auth updated (password reset to compromisso2026, must_change_password set, target ETEC).');
    }

    // 2. Update Profile
    const { error: pError } = await supabase.from('profiles').update({
        exam_target: target
    }).eq('id', userId);

    if (pError) {
        console.error('Profile update FAILED:', pError);
    } else {
        console.log('Profile updated to ETEC.');
    }
}

fixYuri();
