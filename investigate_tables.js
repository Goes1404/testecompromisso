import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function listTables() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1)
  console.log('--- Database Info ---')
  
  // Try to find users with similar email across common tables
  const tables = ['profiles', 'users', 'teachers', 'admins', 'logs']
  for (const t of tables) {
    try {
      const { data: found } = await supabase.from(t).select('*').ilike('email', '%eduardo%')
      if (found && found.length > 0) {
        console.log(`Found in table "${t}":`, found.length)
      }
    } catch (e) {}
  }
}

listTables()
