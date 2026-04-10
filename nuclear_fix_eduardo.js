import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function nuclearFixEduardo() {
  const targetEmail = 'eduardobezerra@compromisso.com'
  const altEmail = 'eduardosantosbezerra@compromisso.com'

  console.log('☢️ Iniciando Fix Nuclear para Eduardo...')

  // 1. Limpar Auth
  const { data: { users } } = await supabase.auth.admin.listUsers({perPage: 1000})
  const toDelete = users.filter(u => 
    u.email.toLowerCase() === targetEmail.toLowerCase() || 
    u.email.toLowerCase() === altEmail.toLowerCase()
  )

  for (const u of toDelete) {
    console.log(`- Deletando Auth ID: ${u.id} (${u.email})`)
    await supabase.auth.admin.deleteUser(u.id)
  }

  // 2. Limpar Profiles
  console.log(`- Limpando perfis com e-mail ${targetEmail}...`)
  await supabase.from('profiles').delete().eq('email', targetEmail)
  await supabase.from('profiles').delete().eq('email', altEmail)

  // 3. Criar fresh no Auth
  console.log(`- Criando nova conta para ${targetEmail}...`)
  const { data, error } = await supabase.auth.admin.createUser({
    email: targetEmail,
    password: 'compromisso2026',
    email_confirm: true,
    user_metadata: {
      role: 'admin',
      display_name: 'Eduardo Bezerra',
      must_change_password: true
    }
  })

  if (error) {
    console.error('❌ ERRO CRÍTICO NO AUTH:', error.message)
    return
  }

  const newId = data.user.id
  console.log(`✅ Sucesso! Novo ID: ${newId}`)

  // 4. Garantir Perfil
  console.log(`- Sincronizando Perfil...`)
  await supabase.from('profiles').upsert({
    id: newId,
    email: targetEmail,
    name: 'Eduardo Bezerra',
    profile_type: 'admin',
    status: 'active'
  })

  console.log('✨ Operação finalizada! Tente logar agora.')
}

nuclearFixEduardo()
