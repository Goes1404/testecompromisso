import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/eduar/Desktop/Eu/Documentos/testecompromisso/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function fixEncoding(text) {
  if (!text) return text;
  return text
    .replace(/Ã£/g, 'ã')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã§/g, 'ç')
    .replace(/Ãµ/g, 'õ')
    .replace(/Ã¢/g, 'â')
    .replace(/Ãª/g, 'ê');
}

async function run() {
  console.log("Fetching announcements...");
  const { data: announcements, error: fetchError } = await supabase.from('announcements').select('*');
  
  if (fetchError) {
    console.error("Error fetching:", fetchError);
    return;
  }

  for (const ann of announcements) {
    const fixedTitle = fixEncoding(ann.title);
    const fixedMessage = fixEncoding(ann.message);
    
    if (fixedTitle !== ann.title || fixedMessage !== ann.message) {
      console.log(`Fixing announcement ${ann.id}...`);
      await supabase.from('announcements').update({ title: fixedTitle, message: fixedMessage }).eq('id', ann.id);
    }
  }
  
  console.log("Done");
}

run();
