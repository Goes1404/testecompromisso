import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function countProfiles() {
  const { data, error } = await supabase.from('profiles').select('profile_type');
  if (error) {
    console.error(error);
    return;
  }
  const counts = {};
  data.forEach(p => {
    const type = p.profile_type || 'null';
    counts[type] = (counts[type] || 0) + 1;
  });
  console.log('Profile Type Counts:', counts);
}

countProfiles()
