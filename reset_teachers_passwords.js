import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function resetAllTeacherPasswords() {
  console.log('🔄 Iniciando Redefinição Global de Senhas dos Professores...')

  // 1. Obter todos os usuários do Auth (Paginado)
  let allAuthUsers = []
  let page = 1
  let hasMore = true
  while (hasMore) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ page: page, perPage: 1000 })
    if (error || users.length === 0) { hasMore = false } 
    else { allAuthUsers = [...allAuthUsers, ...users]; page++ }
  }

  // 2. Obter e-mails de professores do banco de dados para filtrar
  const { data: teacherProfiles } = await supabase.from('profiles').select('email, name').ilike('profile_type', 'teacher')
  const teacherEmails = new Set(teacherProfiles.map(p => p.email.toLowerCase()))

  console.log(`Total de professores no banco: ${teacherProfiles.length}`)
  
  let updatedCount = 0
  let errorCount = 0
  const pass = 'compromisso2026'

  for (const user of allAuthUsers) {
    const email = user.email ? user.email.toLowerCase() : ''
    
    // Critério: Se o e-mail está na lista de professores OU se o metadado diz que é teacher
    const isTeacher = teacherEmails.has(email) || user.user_metadata?.role === 'teacher' || user.user_metadata?.profile_type === 'teacher'
    
    if (isTeacher) {
      console.log(`Resetando: ${email}...`)
      const { error: updateErr } = await supabase.auth.admin.updateUserById(
        user.id,
        { 
          password: pass,
          user_metadata: { ...user.user_metadata, must_change_password: true }
        }
      )

      if (updateErr) {
        console.error(`  ❌ Falha: ${updateErr.message}`)
        errorCount++
      } else {
        updatedCount++
      }
    }
  }

  console.log(`\n✅ Resumo:`)
  console.log(`- Atualizados com sucesso: ${updatedCount}`)
  console.log(`- Falhas: ${errorCount}`)
  console.log(`\nTodos os professores identificados agora usam "${pass}" e serão obrigados a trocar no primeiro acesso.`)
}

resetAllTeacherPasswords()
