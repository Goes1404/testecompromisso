import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testHack() {
  const email = 'adrianevalente@compromisso.com'
  console.log(`Buscando no Auth por ${email}...`)
  
  const { data: { users } } = await supabase.auth.admin.listUsers({perPage: 1000})
  const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase())
  
  if (exists) {
    console.log('Já existe no Auth. Deletando...')
    await supabase.auth.admin.deleteUser(exists.id)
  }

  console.log('Limpando perfil (ilike)...')
  await supabase.from('profiles').delete().ilike('email', email)

  console.log('Tentando criar com email temporário...')
  const tempEmail = `temp_${Date.now()}@test.com`
  const { data: auth, error } = await supabase.auth.admin.createUser({
    email: tempEmail,
    password: 'compromisso2026',
    email_confirm: true
  })

  if (error) {
    console.error('Erro ao criar temp:', error.message)
    return
  }

  console.log('Criado temp. Agora trocando o email para o real...')
  const { error: updateError } = await supabase.auth.admin.updateUserById(auth.user.id, {
    email: email
  })

  if (updateError) {
    console.error('Erro ao trocar para o real:', updateError.message)
  } else {
    console.log('SUCESSO! O hack funcionou.')
  }
}

testHack()
