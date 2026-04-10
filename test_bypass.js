import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function bypassTriggerFix(targetEmail, name) {
  console.log(`\n--- Tentando Bypass para: ${targetEmail} ---`)
  
  // 1. Limpeza total de qualquer registro existente
  const { data: { users } } = await supabase.auth.admin.listUsers({perPage: 1000})
  const existing = users.find(u => u.email.toLowerCase() === targetEmail.toLowerCase())
  if (existing) {
    console.log(`  - Deletando Auth existente: ${existing.id}`)
    await supabase.auth.admin.deleteUser(existing.id)
  }
  await supabase.from('profiles').delete().ilike('email', targetEmail)

  // 2. Criar com um email temporário COMPLETAMENTE aleatório
  const tempEmail = `bypass_${Date.now()}@test.com`
  const { data: auth, error } = await supabase.auth.admin.createUser({
    email: tempEmail,
    password: 'compromisso2026',
    email_confirm: true,
    user_metadata: { display_name: name, must_change_password: true }
  })

  if (error) {
    console.error(`  ❌ Falha no Temp: ${error.message}`)
    return
  }

  const userId = auth.user.id
  console.log(`  ✅ Auth Temp Criado: ${userId}`)

  // 3. AGORA, atualizar o email para o real (Isso geralmente pula o trigger de INSERT)
  const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    email: targetEmail
  })

  if (updateError) {
    console.error(`  ❌ Falha ao mudar para ${targetEmail}: ${updateError.message}`)
  } else {
    console.log(`  🚀 BINGO! Email atualizado para ${targetEmail}`)
    
    // 4. Inserir perfil manualmente
    await supabase.from('profiles').upsert({
      id: userId,
      email: targetEmail,
      name: name,
      profile_type: 'teacher',
      status: 'active'
    })
    console.log(`  ✅ Perfil Sincronizado.`)
  }
}

// Testar com Eduardo e Adriane
async function run() {
  await bypassTriggerFix('eduardobezerra@compromisso.com', 'Eduardo Bezerra')
  await bypassTriggerFix('adrianevalente@compromisso.com', 'Adriane Valente')
}

run()
