import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const tempPassword = 'compromisso2026'

async function parseMarkdownList() {
  const content = fs.readFileSync(path.resolve(__dirname, 'full_student_list_grouped.md'), 'utf-8')
  const lines = content.split('\n')
  const students = []
  
  let currentCourse = ''
  
  for (const line of lines) {
    if (line.includes('## Alunos ENEM')) currentCourse = 'ENEM'
    if (line.includes('## Alunos ETEC')) currentCourse = 'ETEC'
    
    if (line.includes('|') && !line.includes('Nome | E-mail') && !line.includes(':---')) {
      const parts = line.split('|').map(p => p.trim()).filter(p => p !== '')
      if (parts.length >= 2) {
        students.push({
          name: parts[0],
          email: parts[1].toLowerCase(),
          course: currentCourse,
          role: 'student'
        })
      }
    }
  }
  return students
}

const teachers = [
  { name: "Adriane Valente", email: "adrianevalente@compromisso.com" },
  { name: "Alexandre Camargo", email: "alexandrecamargo@compromisso.com" },
  { name: "Angelica Pastori", email: "angelicapastori@compromisso.com" },
  { name: "Augusto Salgado", email: "augustosalgado@compromisso.com" },
  { name: "Augusto Salgado", email: "augustosalgado@compromoisso.com" },
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
  { name: "Luiz Silva", email: "luizsilva@compromisso.com" },
  { name: "Luiz Fabiano", email: "luizfabiano@compromisso.com" },
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
].map(t => ({ ...t, role: 'teacher', course: 'Docente' }))

async function syncAll() {
  console.log('🚀 INICIANDO SINCRONIZAÇÃO TOTAL (PROFESSORES + ALUNOS) 🚀')
  
  const students = await parseMarkdownList()
  const allToSync = [...teachers, ...students]
  
  console.log(`Total para processar: ${allToSync.length}`)
  
  let successCount = 0
  let errorCount = 0

  // Processar em lotes para evitar sobrecarga no Supabase
  const batchSize = 10
  for (let i = 0; i < allToSync.length; i += batchSize) {
    const batch = allToSync.slice(i, i + batchSize)
    console.log(`Processando lote ${Math.floor(i/batchSize) + 1}...`)
    
    await Promise.all(batch.map(async (user) => {
      try {
        // Criar no Auth
        const { data: auth, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { 
            display_name: user.name, 
            role: user.role, 
            course: user.course,
            must_change_password: true 
          }
        })

        if (authError) {
          console.error(`  [AUTH ERROR] ${user.email}: ${authError.message}`)
          errorCount++
          return
        }

        // Criar no Perfil
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: auth.user.id,
          email: user.email,
          name: user.name,
          role: user.role === 'admin' || user.email.includes('eduardo') ? 'admin' : user.role,
          profile_type: user.role,
          course: user.course,
          status: 'active'
        })

        if (profileError) {
          console.error(`  [PROFILE ERROR] ${user.email}: ${profileError.message}`)
          errorCount++
        } else {
          successCount++
        }
      } catch (e) {
        console.error(`  [FATAL ERROR] ${user.email}:`, e.message)
        errorCount++
      }
    }))
  }

  console.log(`\n✅ CONCLUÍDO!`)
  console.log(`Sucesso: ${successCount}`)
  console.log(`Falhas: ${errorCount}`)
}

syncAll()
 Richmond: 2228
