import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function getTeacherEmails() {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('name, email')
    .ilike('profile_type', 'teacher')
    .order('name')

  if (profiles) {
    console.log('| Nome do Professor | E-mail de Acesso |')
    console.log('| :--- | :--- |')
    profiles.forEach(p => {
      console.log(`| ${p.name || 'Sem Nome'} | ${p.email} |`)
    })
  }
}

getTeacherEmails()
