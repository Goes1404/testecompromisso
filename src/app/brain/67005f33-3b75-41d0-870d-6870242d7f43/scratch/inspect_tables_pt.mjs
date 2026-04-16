import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function inspectSchema() {
  const tables = ['aulas', 'modulos', 'conteudos', 'videos', 'courses', 'course_contents', 'lesson_contents', 'subjects', 'trail_items']
  for (const t of tables) {
    try {
      const { data, error, count } = await supabase.from(t).select('*', { count: 'exact', head: false }).limit(1);
      if (error) continue;
      console.log(`Table "${t}" exists. Count: ${count}`);
      if (data && data.length > 0) {
        console.log(`Columns in "${t}":`, Object.keys(data[0]).join(', '));
      }
    } catch (e) {}
  }
}

inspectSchema()
