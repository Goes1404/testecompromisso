
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
    let page = 1;
    let allEmails = [];
    while(true) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (error || !users || users.length === 0) break;
        allEmails = allEmails.concat(users.map(u => u.email.toLowerCase()));
        page++;
    }
    console.log('Total Emails in Auth:', allEmails.length);
    console.log('Match for yaraelima@compromisso.com:', allEmails.includes('yaraelima@compromisso.com'));
    
    // Find missing students from file
    const fileContent = fs.readFileSync('full_student_list_grouped.md', 'utf8');
    const lines = fileContent.split('\n');
    const missing = [];
    const validStudents = [];
    
    for (const line of lines) {
        if (line.includes('|') && !line.includes('Nome') && !line.includes('---')) {
            const parts = line.split('|').map(p => p.trim());
            if (parts.length >= 3) {
                const email = parts[2]?.toLowerCase();
                if (email && email.includes('@')) {
                    validStudents.push(email);
                    if (!allEmails.includes(email)) {
                        missing.push(email);
                    }
                }
            }
        }
    }
    
    console.log('Total valid students in file:', validStudents.length);
    console.log('Total students NOT in Auth:', missing.length);
    if (missing.length > 0) {
        console.log('First 5 missing:', missing.slice(0, 5));
    }
}
run();
