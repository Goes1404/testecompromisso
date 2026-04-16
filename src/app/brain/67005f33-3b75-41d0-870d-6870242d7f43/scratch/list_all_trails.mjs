import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function inspectTrails() {
  const { data: trails, error } = await supabase.from('trails').select('*');
  if (error) {
    console.error('Error fetching trails:', error);
    return;
  }
  console.log('All trails and their statuses:');
  trails.forEach(t => {
    console.log(`ID: ${t.id} | Title: ${t.title} | Status: ${t.status} | Audience: ${t.target_audience}`);
  });
}

inspectTrails()
