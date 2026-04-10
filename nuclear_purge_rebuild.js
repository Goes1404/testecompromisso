import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const teacherEmails = [
  "adrianevalente@compromisso.com",
  "alexandrecamargo@compromisso.com",
  "angelicapastori@compromisso.com",
  "augustosalgado@compromisso.com",
  "augustosalgado@compromoisso.com",
  "brunolima@compromisso.com",
  "christianeteodoro@compromisso.com",
  "denisbrito@compromisso.com",
  "eduardobezerra@compromisso.com",
  "fernandomartins@compromisso.com",
  "heliocarvalho@compromisso.com",
  "jamescarvalho@compromisso.com",
  "jessicasilva@compromisso.com",
  "joelmabarbosa@compromisso.com",
  "jorgeniocosta@compromisso.com",
  "lucasgonsalves@compromisso.com",
  "luizsilva@compromisso.com",
  "luizfabiano@compromisso.com",
  "matheusgoesdasilva@compromisso.com",
  "matheussantos@compromisso.com",
  "matheussilva@compromisso.com",
  "pauloaraujo@compromisso.com",
  "paulosantos@compromisso.com",
  "paulosilva@compromisso.com",
  "reginaldolucindo@compromisso.com",
  "rogerioloureiro@compromisso.com",
  "valeriasilva@compromisso.com",
  "selmaoliveira@compromisso.com"
]

async function nuclearPurgeAndRebuild() {
  console.log('☢️ INICIANDO PURGA NUCLEAR E RECONSTRUÇÃO ☢️')
  
  // 1. Coletar IDs de todos os que possam existir
  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  console.log(`- Analisando ${users.length} usuários totais.`)
  
  for (const email of teacherEmails) {
    const cleanEmail = email.toLowerCase().trim()
    console.log(`\n>>> Purificando: ${cleanEmail}`)

    // Deletar perfis por e-mail (case insensitive)
    await supabase.from('profiles').delete().ilike('email', cleanEmail)
    
    // Deletar do Auth
    const matches = users.filter(u => u.email.toLowerCase() === cleanEmail)
    for (const m of matches) {
      console.log(`  - Deletando Auth ID: ${m.id}`)
      await supabase.auth.admin.deleteUser(m.id)
    }
  }

  console.log('\n--- AGUARDANDO SINCRONIZAÇÃO DO BANCO (5s) ---')
  await new Promise(r => setTimeout(r, 5000))

  const tempPassword = 'compromisso2026'

  for (const email of teacherEmails) {
    const cleanEmail = email.toLowerCase().trim()
    console.log(`\n>>> Criando: ${cleanEmail}`)

    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: cleanEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { role: 'teacher', must_change_password: true }
      })

      if (error) {
        console.error(`  ❌ Falha: ${error.message}`)
        continue
      }

      console.log(`  ✅ Criado: ${data.user.id}`)

      // Sincronizar Perfil
      await supabase.from('profiles').insert({
        id: data.user.id,
        email: cleanEmail,
        profile_type: 'teacher',
        role: 'teacher',
        status: 'active'
      })
    } catch (e) {
      console.error(`  💥 Fatal: ${e.message}`)
    }
  }

  console.log('\n✨ PURGA COMPLETA E RECONSTRUÇÃO FINALIZADA ✨')
}

nuclearPurgeAndRebuild()
 Richmond: 2228
