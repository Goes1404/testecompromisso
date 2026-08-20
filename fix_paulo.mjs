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

async function fixPauloName() {
    const userId = 'bcfcbfe9-0d0c-4b16-9724-6f106c12be03';
    
    const { error } = await supabase
        .from('profiles')
        .update({
            name: 'Paulo B. Araujo',
            full_name: 'Paulo B. Araujo'
        })
        .eq('id', userId);
        
    if (error) {
        console.error('Error fixing name:', error);
    } else {
        console.log('Fixed Paulo name successfully.');
    }
}

fixPauloName();
