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

// Lista de Professores extraída da imagem (Fiel à imagem)
const teachers = [
  { name: "ADRIANE RANIERI VALENTE", email: "adrianervalente@compromisso.com", subject: "Professora de Matemática" },
  { name: "Christiane Teodoro", email: "christianeteodoro@compromisso.com", subject: "Coordenadora Pedagógica" },
  { name: "Angelica Pastori de Araujo", email: "angelicaparaujo@compromisso.com", subject: "Professora de Geografia e Inglês" },
  { name: "Joelma Vieira Barbosa", email: "joelmavbarbosa@compromisso.com", subject: "Professora" },
  { name: "Paulo Bezerra de Araújo", email: "paulobaraujo@compromisso.com", subject: "Prof. Química" },
  { name: "Francisco Pio", email: "franciscopio@compromisso.com", subject: "Coordenador Pedagógico" },
  { name: "Paulo Souza dos Santos", email: "paulossantos@compromisso.com", subject: "Agente de Organização" },
  { name: "Alexandre Santos de Camargo", email: "alexandrescamargo@compromisso.com", subject: "Atualidades" },
  { name: "Valéria Bernardo da Silva", email: "valeriabsilva@compromisso.com", subject: "Prof. Redação" },
  { name: "Denis de Jesus Brito", email: "denisjbrito@compromisso.com", subject: "Apoio - Representante do Colégio" },
  { name: "James Pio do Nascimento Seixas", email: "jamespcarvalho@compromisso.com", subject: "Professor de Geografia" },
  { name: "Paulo Francisco Nascimento da Silva", email: "paulofsilva@compromisso.com", subject: "Assessor" },
  { name: "Régis (Reginaldo Lucindo)", email: "reginaldolucindo@compromisso.com", subject: "Prof. História/Geografia" },
  { name: "Claudemir Amaral", email: "claudemiramaral@compromisso.com", subject: "Professor" },
  { name: "Teylor Paulo Nascimento da Silva", email: "teylorpsilva@compromisso.com", subject: "Assistente" },
  { name: "Pedro Henrique Alves Sampaio", email: "pedrohsampaio@compromisso.com", subject: "Prof. Física" },
  { name: "Jessica Aparecida Miguel da Silva", email: "jessicaasilva@compromisso.com", subject: "Psicóloga" },
  { name: "Fernando Martins", email: "fernandomartins@compromisso.com", subject: "Professor de Redação" },
  { name: "BRUNO HENRIQUE LIMA", email: "brunohlima@compromisso.com", subject: "Administrador" },
  { name: "Lucas Sá Teles Gonsalves", email: "lucassgonsalves@compromisso.com", subject: "Prof. Matemática" },
  { name: "Luiz Fabiano da Silva", email: "luizfsilva@compromisso.com", subject: "Prof. Biologia" },
  { name: "Helio Fernando de Carvalho", email: "heliofcarvalho@compromisso.com", subject: "Prof. Matemática" },
  { name: "ABRAHÃO COSTA DE FREITAS", email: "abrahaocfreitas@compromisso.com", subject: "Prof. Literatura" },
  { name: "Selma Samira Souza Oliveira", email: "selmasoliveira@compromisso.com", subject: "Secretaria" },
  { name: "Roger (Rogério Loureiro)", email: "rogerioloureiro@compromisso.com", subject: "Prof. Matemática" },
  { name: "Matheus Goes da Silva", email: "matheusgsilva@compromisso.com", subject: "Equipe Técnica" },
  { name: "Matheus Santana dos Santos", email: "matheusssantos@compromisso.com", subject: "VideoMaker" },
  { name: "Jorgenio Miranda Costa", email: "jorgeniomcosta@compromisso.com", subject: "Professor Química" },
  { name: "Eduardo Santos Bezerra", email: "eduardosbezerra@compromisso.com", subject: "Equipe Técnica" },
  { name: "Augusto Salgado", email: "augustosalgado@compromisso.com", subject: "Professor de História e Sociologia" }
]

async function parseStudents() {
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

async function definitiveRebuild() {
  console.log('🚀 INICIANDO RECONSTRUÇÃO DEFINITIVA (LIMPEZA + CRIAÇÃO) 🚀')
  
  const students = await parseStudents()
  const allUsers = [
    ...teachers.map(t => ({ ...t, role: 'teacher', course: t.subject })),
    ...students
  ]

  console.log(`Pessoas para processar: ${allUsers.length}`)

  for (let i = 0; i < allUsers.length; i += 5) {
    const batch = allUsers.slice(i, i + 5)
    console.log(`Processando lote ${Math.floor(i/5) + 1}...`)

    await Promise.all(batch.map(async (u) => {
      const email = u.email.toLowerCase().trim()
      try {
        // 1. Limpeza agressiva individual para evitar conflitos
        const { data: { users } } = await supabase.auth.admin.listUsers() 
        const existing = users.find(x => x.email.toLowerCase() === email)
        if (existing) await supabase.auth.admin.deleteUser(existing.id)
        await supabase.from('profiles').delete().ilike('email', email)

        // 2. Criar no Auth
        const { data: auth, error: authError } = await supabase.auth.admin.createUser({
          email: email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { 
            display_name: u.name, 
            role: u.role === 'admin' || email.includes('eduardo') ? 'admin' : u.role, 
            course: u.course,
            must_change_password: true 
          }
        })

        if (authError) {
          console.error(`  [AUTH ERROR] ${email}: ${authError.message}`)
          return
        }

        // 3. Criar no Perfil
        await supabase.from('profiles').upsert({
          id: auth.user.id,
          email: email,
          name: u.name,
          role: u.role === 'admin' || email.includes('eduardo') ? 'admin' : u.role,
          profile_type: u.role,
          course: u.course,
          status: 'active'
        })
        console.log(`  ✅ Sincronizado: ${email}`)

      } catch (e) {
        console.error(`  [FATAL ERROR] ${email}:`, e.message)
      }
    }))
  }

  console.log('\n✨ RECONSTRUÇÃO DEFINITIVA FINALIZADA COM SUCESSO! ✨')
}

definitiveRebuild()
