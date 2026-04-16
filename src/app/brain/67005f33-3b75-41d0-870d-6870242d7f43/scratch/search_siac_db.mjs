import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function searchSIAC() {
  // We can't easily search all tables and columns without knowing them.
  // Let's try to find common branding tables.
  const tables = ['profiles', 'trails', 'modules', 'learning_contents'];
  
  for (const table of tables) {
    console.log(`Searching in table: ${table}...`);
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(100);

    if (error) {
      console.error(`Error fetching from ${table}:`, error);
      continue;
    }

    const firstRowStr = JSON.stringify(data).toLowerCase();
    if (firstRowStr.includes('siac')) {
      console.log(`FOUND 'SIAC' in table: ${table}`);
      console.log(JSON.stringify(data, null, 2));
    }
  }
}

searchSIAC();
