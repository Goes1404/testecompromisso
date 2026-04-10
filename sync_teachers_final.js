import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function updateAllTeachers() {
  console.log('🚀 Iniciando atualização/criação de Professores...')

  // 1. Obter todos os usuários do Auth para busca rápida
  let allAuthUsers = []
  let page = 1
  let hasMore = true
  while (hasMore) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ page: page, perPage: 1000 })
    if (error || users.length === 0) { hasMore = false } 
    else { allAuthUsers = [...allAuthUsers, ...users]; page++ }
  }
  const authMap = new Map(allAuthUsers.map(u => [u.email.toLowerCase(), u]))

  // 2. Obter todos os perfis de professores
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .ilike('profile_type', 'teacher')

  if (profileError) {
    console.error('Erro ao buscar perfis:', profileError)
    return
  }

  console.log(`Encontrados ${profiles.length} perfis de professores no banco.`)
  const tempPassword = 'compromisso2026'

  for (const profile of profiles) {
    const email = profile.email.toLowerCase()
    const existingAuth = authMap.get(email)
    
    console.log(`\n---------------------------------`)
    console.log(`Processando: ${profile.name} (${email})`)

    if (existingAuth) {
      // 🔄 ATUALIZAR USUÁRIO EXISTENTE
      console.log(`- Usuário encontrado no Auth. Atualizando credenciais...`)
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingAuth.id,
        {
          password: tempPassword,
          user_metadata: {
            must_change_password: true,
            display_name: profile.name,
            full_name: profile.name,
            role: 'teacher'
          }
        }
      )

      if (updateError) {
        console.error(`  ❌ Erro ao atualizar Auth: ${updateError.message}`)
      } else {
        console.log(`  ✅ Auth atualizado e senha resetada.`)
      }
      
      // Garantir que o ID no profile está correto (caso haja discrepância)
      if (profile.id !== existingAuth.id) {
         console.log(`  ⚠️ Discrepância de ID detectada. Corrigindo ID do perfil...`)
         await fixProfileId(profile.id, existingAuth.id)
      }

    } else {
      // ✨ CRIAR NOVO USUÁRIO NO AUTH
      console.log(`- Usuário NÃO encontrado no Auth. Criando nova conta...`)
      const { data: newData, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          must_change_password: true,
          display_name: profile.name,
          full_name: profile.name,
          role: 'teacher'
        }
      })

      if (createError) {
        console.error(`  ❌ Erro ao criar usuário: ${createError.message}`)
      } else if (newData?.user) {
        console.log(`  ✅ Conta criada no Auth. Sincronizando tabelas...`)
        await fixProfileId(profile.id, newData.user.id)
      }
    }
  }

  console.log('\n✨ Todos os professores foram processados!')
}

async function fixProfileId(oldId, newId) {
  try {
    // 1. Atualizar referências em Trilhas
    const { error: trailError } = await supabase
      .from('trails')
      .update({ teacher_id: newId })
      .eq('teacher_id', oldId)
    
    if (trailError) console.error(`    ⚠️ Erro ao atualizar trails: ${trailError.message}`)
    else console.log(`    🔗 Referências em 'trails' atualizadas.`)

    // 2. Atualizar o ID no próprio perfil
    // Como o ID é PK, temos que deletar o antigo e inserir o novo ou fazer um update cuidadoso
    // Upsert com o novo ID e depois deletar o antigo
    const { data: oldProfile } = await supabase.from('profiles').select('*').eq('id', oldId).single()
    
    const { error: upsertError } = await supabase.from('profiles').upsert({
      ...oldProfile,
      id: newId,
      updated_at: new Date().toISOString()
    })

    if (upsertError) {
      console.error(`    ❌ Erro ao upsert do novo perfil: ${upsertError.message}`)
    } else {
      if (oldId !== newId) {
        await supabase.from('profiles').delete().eq('id', oldId)
        console.log(`    🆔 ID do perfil migrado com sucesso.`)
      }
    }
  } catch (err) {
    console.error(`    💥 Erro na migração de ID:`, err.message)
  }
}

updateAllTeachers()
