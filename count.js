
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
    const { data } = await supabase.from('profiles').select('profile_type');
    const counts = {};
    data.forEach(p => {
        const t = p.profile_type || 'NULL/EMPTY';
        counts[t] = (counts[t] || 0) + 1;
    });
    console.log('Profile Types Distribution:', counts);
    
    // Also check Auth users count one more time
    let page = 1;
    let totalAuth = 0;
    while(true) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (error || !users || users.length === 0) break;
        totalAuth += users.length;
        page++;
        if (page > 10) break; // sanity check
    }
    console.log('Total Auth Users:', totalAuth);
}
run();
