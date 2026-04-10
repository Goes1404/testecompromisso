import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function finalizeTeachers() {
  const { data: profiles } = await supabase.from('profiles').select('*').ilike('profile_type', 'teacher')
  
  for (const p of profiles) {
    // Se o nome no perfil estiver 'null' ou vazio, tentamos recuperar do email ou deixar um placeholder
    if (!p.name || p.name === 'null') {
      const suggestedName = p.email.split('@')[0].split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
      await supabase.from('profiles').update({ name: suggestedName }).eq('id', p.id)
      console.log(`Updated name for ${p.email} to ${suggestedName}`)
    }
  }
}

finalizeTeachers()
