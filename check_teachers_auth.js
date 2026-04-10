import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTeachers() {
  const { data: profiles } = await supabase.from('profiles').select('*').ilike('profile_type', 'teacher')
  console.log(`Total de perfis de professores: ${profiles?.length}`)
  
  const { data: { users }, error } = await supabase.auth.admin.listUsers()
  console.log(`Total de usuários no Auth: ${users?.length}`)

  const authEmails = new Set(users.map(u => u.email?.toLowerCase()))
  
  const missingInAuth = profiles.filter(p => !authEmails.has(p.email.toLowerCase()))
  console.log(`Professores SEM conta no Auth: ${missingInAuth.length}`)
  
  if (missingInAuth.length > 0) {
    console.log('Exemplos de e-mails faltando no Auth:')
    missingInAuth.slice(0, 5).forEach(p => console.log(`- ${p.email}`))
  }
}

checkTeachers()
