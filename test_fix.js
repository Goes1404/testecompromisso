import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testOne() {
  const email = 'luizfabiano@compromisso.com'
  const { data: p } = await supabase.from('profiles').select('*').eq('email', email).single()
  console.log('Profile found:', p.id)

  console.log('Deleting profile...')
  const { error: delErr } = await supabase.from('profiles').delete().eq('id', p.id)
  if (delErr) {
    console.error('Del error:', delErr)
  } else {
    console.log('Deleted. Creating auth...')
    const { data: auth, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: 'compromisso2026',
      email_confirm: true
    })
    if (authErr) console.error('Auth error:', authErr)
    else console.log('Auth created:', auth.user.id)
  }
}

testOne()
