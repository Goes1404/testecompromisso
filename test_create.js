
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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
    const email = 'yaraelima@compromisso.com';
    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: 'compromisso2026',
        email_confirm: true,
        user_metadata: {
            full_name: 'Yara Eduarda Ramos Lima',
            profile_type: 'student'
        }
    });
    
    if (error) {
        console.log('Error:', error.message);
    } else {
        console.log('Successly created Yara:', data.user.id);
    }
}
run();
