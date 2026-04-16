import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function inspectModules() {
  const trailId = 'dc5c8fb1-71a7-461c-a422-76c70c828070'; // Matemática Básica
  const { data: modules, error } = await supabase.from('modules').select('*').eq('trail_id', trailId).order('order_index');
  if (error) {
    console.error('Error fetching modules:', error);
    return;
  }
  console.log(`Modules for Matemática Básica (${trailId}):`);
  modules.forEach(m => {
    console.log(`ID: ${m.id} | Title: ${m.title} | Order: ${m.order_index}`);
  });
}

inspectModules()
