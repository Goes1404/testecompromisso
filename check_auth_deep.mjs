
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

async function findInAuth() {
    let page = 1;
    let found = [];
    const targets = ['leonardofgodoi', 'luizclaudio', 'mathiasgnobre'];
    
    while(true) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (error || !users || users.length === 0) break;
        
        for (const user of users) {
           if (targets.some(t => user.email.toLowerCase().includes(t))) {
               found.push(user);
           }
        }
        page++;
    }
    
    console.log('Found in Auth:');
    console.log(JSON.stringify(found, null, 2));
}

findInAuth();
