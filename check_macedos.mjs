import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

// Load env
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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMacedos() {
    const ids = [
        'b21c2640-4fba-4b4f-87e0-b135ffe90586',
        'b173bfd1-40f3-4508-bae9-2ff4295a3730',
        '3db351fa-7ace-437e-8f66-a387ce896d7f',
        '28d15989-2d09-4331-9cbe-6fa3b3c4cb86'
    ];

    const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role, profile_type')
        .in('id', ids);
        
    if (error) {
        console.error('Error fetching profiles:', error);
        return;
    }
    
    console.log('Macedo profiles:', data);
}

checkMacedos();
