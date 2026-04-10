import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const officialList = [
  { name: "Adriane Valente", email: "adrianevalente@compromisso.com" },
  { name: "Alexandre Camargo", email: "alexandrecamargo@compromisso.com" },
  { name: "Angelica Pastori", email: "angelicapastori@compromisso.com" },
  { name: "Augusto Salgado (1)", email: "augustosalgado@compromisso.com" },
  { name: "Augusto Salgado (2)", email: "augustosalgado@compromoisso.com" },
  { name: "Bruno Lima", email: "brunolima@compromisso.com" },
  { name: "Christiane Teodoro", email: "christianeteodoro@compromisso.com" },
  { name: "Denis Brito", email: "denisbrito@compromisso.com" },
  { name: "Eduardo Bezerra", email: "eduardobezerra@compromisso.com" },
  { name: "Fernando Martins", email: "fernandomartins@compromisso.com" },
  { name: "Helio Carvalho", email: "heliocarvalho@compromisso.com" },
  { name: "James Carvalho", email: "jamescarvalho@compromisso.com" },
  { name: "Jessica Silva", email: "jessicasilva@compromisso.com" },
  { name: "Joelma Barbosa", email: "joelmabarbosa@compromisso.com" },
  { name: "Jorgenio Costa", email: "jorgeniocosta@compromisso.com" },
  { name: "Lucas Gonsalves", email: "lucasgonsalves@compromisso.com" },
  { name: "Luiz Silva (1)", email: "luizsilva@compromisso.com" },
  { name: "Luiz Silva (2)", email: "luizfabiano@compromisso.com" },
  { name: "Matheus Goes", email: "matheusgoesdasilva@compromisso.com" },
  { name: "Matheus Santos", email: "matheussantos@compromisso.com" },
  { name: "Matheus Silva", email: "matheussilva@compromisso.com" },
  { name: "Paulo Araújo", email: "pauloaraujo@compromisso.com" },
  { name: "Paulo Santos", email: "paulosantos@compromisso.com" },
  { name: "Paulo Silva", email: "paulosilva@compromisso.com" },
  { name: "Régis Lucindo", email: "reginaldolucindo@compromisso.com" },
  { name: "Roger Loureiro", email: "rogerioloureiro@compromisso.com" },
  { name: "Valéria Silva", email: "valeriasilva@compromisso.com" },
  { name: "Selma Oliveira", email: "selmaoliveira@compromisso.com" }
]

async function deepCleanAndReset() {
  console.log('🧹 INICIANDO LIMPEZA PROFUNDA E RESET DE SENHAS 🧹')
  
  // Pre-fetch Auth users to handle deletions correctly
  const { data: { users } } = await supabase.auth.admin.listUsers({perPage: 1000})
  const authMap = new Map(users.map(u => [u.email.toLowerCase(), u]))

  const tempPassword = 'compromisso2026'

  for (const item of officialList) {
    const email = item.email.toLowerCase().trim()
    console.log(`\n--- ${item.name} (${email}) ---`)

    try {
      // 1. LIMPEZA MANUAL AGRESSIVA
      // Tentar renomear qualquer perfil existente que tenha esse email para liberar o UNIQUE
      await supabase.from('profiles').update({ email: `old_${Date.now()}@test.com` }).eq('email', email)
      await supabase.from('profiles').delete().eq('email', email)
      
      const existingAuth = authMap.get(email)
      if (existingAuth) {
        console.log(`  - Removendo usuário Auth antigo...`)
        await supabase.auth.admin.deleteUser(existingAuth.id)
      }

      // 2. TENTATIVA DE CRIAÇÃO (COM RETRY SE DER DATABASE ERROR)
      console.log(`  - Criando nova conta...`)
      let { data: auth, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { 
          display_name: item.name, 
          role: 'teacher', 
          must_change_password: true 
        }
      })

      // Se der erro de banco, tentamos criar com um email falso e DEPOIS trocar (Hacky Bypass)
      if (authError && authError.message.includes('Database error')) {
        console.log(`  - [HACK] Erro de gatilho detectado. Tentando bypass por troca de e-mail...`)
        const tempEmailProfile = `bypass_${Date.now()}@compromisso.com`
        const { data: authBypass, error: bypassError } = await supabase.auth.admin.createUser({
          email: tempEmailProfile,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { display_name: item.name, role: 'teacher', must_change_password: true }
        })

        if (!bypassError) {
          // Tentar trocar o e-mail para o real AGORA que o registro do perfil já foi criado pelo trigger
          const { error: finalError } = await supabase.auth.admin.updateUserById(authBypass.user.id, {
            email: email
          })
          if (!finalError) {
            console.log(`  ✅ Bypass funcionou!`)
            auth = authBypass
          } else {
            console.error(`  ❌ Bypass falhou na troca: ${finalError.message}`)
            continue
          }
        } else {
          console.error(`  ❌ Bypass falhou na criação: ${bypassError.message}`)
          continue
        }
      } else if (authError) {
        console.error(`  ❌ Erro ao criar: ${authError.message}`)
        continue
      }

      // 3. ATUALIZAÇÃO FINAL DO PERFIL
      const finalId = auth.user.id
      await supabase.from('profiles').upsert({
        id: finalId,
        email: email,
        name: item.name,
        profile_type: 'teacher',
        role: 'teacher',
        status: 'active'
      })
      console.log(`  ✅ Conta Ativa e Perfil Sincronizado.`)

    } catch (err) {
      console.error(`  💥 Falha: ${err.message}`)
    }
  }

  console.log('\n✨ OPERAÇÃO DE LIMPEZA CONCLUÍDA! ✨')
}

deepCleanAndReset()
 Richmond: 2228
