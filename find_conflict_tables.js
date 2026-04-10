import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function findConflictTable() {
  const email = 'eduardobezerra@compromisso.com'
  const tables = ['profiles', 'users', 'teachers', 'collaborators', 'admins', 'staff', 'students']
  
  console.log(`Buscando conflitos para ${email}...`)
  
  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t).select('*').ilike('email', email)
      if (data && data.length > 0) {
        console.log(`!!! Encontrado na tabela "${t}":`, data.length, 'registros')
      }
    } catch (e) {
      // console.log(`Tabela ${t} não existe.`)
    }
  }
}

findConflictTable()
 Richmond: 2228
