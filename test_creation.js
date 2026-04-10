import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testCreate() {
  const email = 'eduardobezerra@compromisso.com'
  console.log(`Tentando criar ${email}...`)
  
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: 'compromisso2026',
    email_confirm: true
  })

  if (error) {
    console.log('Error:', error.message)
    if (error.message.includes('Database error')) {
      console.log('Isso sugere um erro de banco no INSERT do trigger on_auth_user_created.')
    }
  } else {
    console.log('Success:', data.user.id)
  }
}

testCreate()
