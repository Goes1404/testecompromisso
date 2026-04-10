import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function updateTeachers() {
  console.log('--- Iniciando atualização de Professores ---')
  
  // 1. Buscar todos os perfis do tipo teacher
  const { data: teachers, error: fetchError } = await supabase
    .from('profiles')
    .select('id, name, email, profile_type')
    .ilike('profile_type', 'teacher')

  if (fetchError) {
    console.error('Error fetching teachers:', fetchError)
    return
  }

  console.log(`Encontrados ${teachers?.length || 0} professores.`)

  if (!teachers || teachers.length === 0) {
    console.log('Nenhum professor encontrado para atualizar.')
    return
  }

  const tempPassword = 'compromisso2026'

  for (const teacher of teachers) {
    console.log(`\nAtualizando: ${teacher.name} (${teacher.email})`)
    
    try {
      // 2. Atualizar a senha no Auth do Supabase e setar metadados
      const { data: authUser, error: authError } = await supabase.auth.admin.updateUserById(
        teacher.id,
        { 
          password: tempPassword,
          user_metadata: { 
            must_change_password: true,
            display_name: teacher.name // Garantindo o nome de exibição
          }
        }
      )

      if (authError) {
        console.error(`❌ Erro ao atualizar Auth para ${teacher.email}:`, authError.message)
      } else {
        console.log(`✅ Auth atualizado para ${teacher.email}`)
      }

      // 3. Garantir que a coluna must_change_password exista no perfil (se aplicável)
      // Nota: O middleware geralmente olha o user_metadata, mas vamos garantir no profile se houver a coluna
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          // Se houver campos específicos de profile para atualizar, adicione aqui
          // Algumas implementações usam must_change_password no banco também
        })
        .eq('id', teacher.id)

      if (profileError) {
        console.warn(`⚠️ Aviso ao atualizar perfil de ${teacher.email}:`, profileError.message)
      }

    } catch (err) {
      console.error(`💥 Erro crítico em ${teacher.email}:`, err)
    }
  }

  console.log('\n--- Processo concluído! ---')
}

updateTeachers()
