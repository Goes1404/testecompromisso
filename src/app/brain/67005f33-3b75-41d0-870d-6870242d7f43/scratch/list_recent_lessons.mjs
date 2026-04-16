import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function inspectContents() {
  const { data: contents, error } = await supabase.from('learning_contents').select('*, modules(title, trails(title))').order('created_at', { ascending: false }).limit(50);
  if (error) {
    console.error('Error fetching contents:', error);
    return;
  }
  console.log('Recent 50 lessons:');
  contents.forEach(c => {
    console.log(`ID: ${c.id} | Title: ${c.title} | Module: ${c.modules?.title} | Trail: ${c.modules?.trails?.title} | CreatedAt: ${c.created_at}`);
  });
}

inspectContents()
