import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
async function check() {
  const { data: trails } = await supabase.from('trails').select('id, title');
  for (const t of trails) {
    const { data: mods } = await supabase.from('modules').select('id').eq('trail_id', t.id);
    const modIds = mods.map(m => m.id);
    const { count } = await supabase.from('learning_contents').select('*', { count: 'exact', head: true }).in('module_id', modIds);
    console.log(`Trail: ${t.title} | Lessons: ${count}`);
  }
}
check()
