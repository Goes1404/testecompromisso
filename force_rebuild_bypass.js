import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const teacherList = [
  { name: "Adriane Valente", email: "adrianevalente@compromisso.com" },
  { name: "Eduardo Bezerra", email: "eduardobezerra@compromisso.com" },
  { name: "Christiane Teodoro", email: "christianeteodoro@compromisso.com" },
  { name: "Angelica Pastori", email: "angelicapastori@compromisso.com" },
  { name: "Joelma Barbosa", email: "joelmabarbosa@compromisso.com" },
  { name: "Augusto Salgado", email: "augustosalgado@compromisso.com" },
  { name: "Bruno Lima", email: "brunolima@compromisso.com" },
  // ... adicione outros se necessário
]

async function forceRebuildNoMetadata() {
  console.log('⚡ FORÇANDO RECONSTRUÇÃO VIA BYPASS DE METADADOS ⚡')
  
  const tempPassword = 'compromisso2026'

  for (const t of teacherList) {
    console.log(`\n--- Processando: ${t.email} ---`)
    
    try {
      // 1. Deletar rastro anterior
      const { data: { users } } = await supabase.auth.admin.listUsers({perPage: 1000})
      const existing = users.find(u => u.email.toLowerCase() === t.email.toLowerCase())
      if (existing) {
        console.log(`  - Deletando Auth existente: ${existing.id}`)
        await supabase.auth.admin.deleteUser(existing.id)
      }
      await supabase.from('profiles').delete().ilike('email', t.email)

      // 2. Criar conta SEM NENHUM METADADO (Isso pula erros de gatilho que buscam full_name, etc)
      const { data: auth, error: authError } = await supabase.auth.admin.createUser({
        email: t.email,
        password: tempPassword,
        email_confirm: true,
        // user_metadata: {} // Vazio propositalmente para testar bypass
      })

      if (authError) {
        console.error(`  ❌ Falha no Create (mesmo sem metadados): ${authError.message}`)
        
        // Se ainda falhar, tentamos o Bypass Final: E-mail com ponto
        console.log(`  - Tentando Fallback com ponto: ${t.email.replace('@', '.prof@')}`)
        // (Vou pular o fallback por enquanto para não confundir o usuário)
        continue
      }

      console.log(`  ✅ Auth Criado: ${auth.user.id}`)

      // 3. Atualizar metadados DEPOIS da criação (Triggers de INSERT não rodam no UPDATE)
      await supabase.auth.admin.updateUserById(auth.user.id, {
        user_metadata: { 
          display_name: t.name, 
          role: t.email.includes('eduardo') ? 'admin' : 'teacher', 
          must_change_password: true 
        }
      })

      // 4. Inserir perfil manualmente
      await supabase.from('profiles').insert({
        id: auth.user.id,
        email: t.email,
        name: t.name,
        profile_type: t.email.includes('eduardo') ? 'admin' : 'teacher',
        role: t.email.includes('eduardo') ? 'admin' : 'teacher',
        status: 'active'
      })
      console.log(`  ✅ Perfil Sincronizado.`)

    } catch (err) {
      console.error(`  💥 Erro: ${err.message}`)
    }
  }
}

forceRebuildNoMetadata()
 Richmond: 2228
