import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function repairMissingTeachers() {
  console.log('🛠️ Iniciando Reparo de 20 Professores sem Auth...')

  // 1. Obter usuários no Auth para saber quem REALMENTE falta
  let allAuthUsers = []
  let page = 1
  let hasMore = true
  while (hasMore) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ page: page, perPage: 1000 })
    if (error || users.length === 0) { hasMore = false } 
    else { allAuthUsers = [...allAuthUsers, ...users]; page++ }
  }
  const authEmails = new Set(allAuthUsers.map(u => u.email.toLowerCase()))

  // 2. Obter perfis de professores
  const { data: profiles } = await supabase.from('profiles').select('*').ilike('profile_type', 'teacher')
  const missing = profiles.filter(p => !authEmails.has(p.email.toLowerCase()))

  console.log(`Total a reparar: ${missing.length}`)
  const tempPassword = 'compromisso2026'

  for (const prof of missing) {
    const originalEmail = prof.email.toLowerCase()
    console.log(`\nReparando: ${prof.name} (${originalEmail})`)

    try {
      // Step A: Renomear o e-mail no perfil atual para evitar conflito de UNIQUE
      const tempEmail = `repair_${Date.now()}_${originalEmail}`
      await supabase.from('profiles').update({ email: tempEmail }).eq('id', prof.id)
      console.log(`  - Perfil antigo movido para e-mail temporário.`)

      // Step B: Criar o usuário no Auth
      const { data: authData, error: createError } = await supabase.auth.admin.createUser({
        email: originalEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          must_change_password: true,
          display_name: prof.name,
          full_name: prof.name,
          role: 'teacher'
        }
      })

      if (createError) {
        console.error(`  ❌ Falha ao criar no Auth: ${createError.message}`)
        // Reverter e-mail se falhar
        await supabase.from('profiles').update({ email: originalEmail }).eq('id', prof.id)
        continue
      }

      const newId = authData.user.id
      console.log(`  ✅ Conta criada no Auth (Novo ID: ${newId})`)

      // Step C: O trigger deve ter criado um novo perfil. Vamos atualizar esse novo perfil com os dados do antigo.
      // Primeiro, migrar as trilhas
      const { error: trailError } = await supabase
        .from('trails')
        .update({ teacher_id: newId })
        .eq('teacher_id', prof.id)
      
      console.log(`  🔗 Referências em 'trails' migradas.`)

      // Step D: Atualizar o novo perfil com dados extras se houver e deletar o antigo
      // (Algumas colunas podem não ter sido preenchidas pelo trigger)
      await supabase.from('profiles').upsert({
        ...prof,
        id: newId,
        email: originalEmail,
        updated_at: new Date().toISOString()
      })

      await supabase.from('profiles').delete().eq('id', prof.id)
      console.log(`  🆔 Perfil finalizado e sincronizado.`)

    } catch (err) {
      console.error(`  💥 Erro inesperado:`, err.message)
    }
  }

  console.log('\n✅ Reparo concluído!')
}

repairMissingTeachers()
