import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const collaborators = [
  { name: "ADRIANE RANIERI VALENTE", role: "teacher", subject: "Professora de Matemática", email: "adrianevalente@compromisso.com", fallback: "adriane@compromissose.com" },
  { name: "Christiane Teodoro", role: "admin", subject: "Coordenadora Pedagógica", email: "christianeteodoro@compromisso.com" },
  { name: "Angelica Pastori de Araujo", role: "teacher", subject: "Professora de Geografia e Inglês para V.", email: "angelicaaraujo@compromisso.com", fallback: "angelica@compromissose.com" },
  { name: "Joelma Vieira Barbosa", role: "teacher", subject: "Professora", email: "joelmabarbosa@compromisso.com" },
  { name: "Paulo Bezerra de Araújo", role: "teacher", subject: "Prof. Química", email: "pauloaraujo@compromisso.com", fallback: "paulo.quimica@compromissose.com" },
  { name: "Francisco Pio", role: "admin", subject: "Coordenador Pedagógico", email: "franciscopio@compromisso.com" },
  { name: "Paulo Souza dos Santos", role: "teacher", subject: "Agente de Organização - Paulo", email: "paulosantos@compromisso.com", fallback: "paulo.santos@compromissose.com" },
  { name: "Alexandre Santos de Camargo", role: "teacher", subject: "Atualidades", email: "alexandrecamargo@compromisso.com", fallback: "alexandre@compromissose.com" },
  { name: "Valéria Bernardo da Silva", role: "teacher", subject: "Prof. Redação", email: "valeriasilva@compromisso.com", fallback: "valeria@compromissose.com" },
  { name: "Denis de Jesus Brito", role: "teacher", subject: "Apoio - Representante do Colégio", email: "denisbrito@compromisso.com", fallback: "denis@compromissose.com" },
  { name: "James Pio do Nascimento Seixas de Carvalho", role: "teacher", subject: "Professor de Geografia", email: "jamescarvalho@compromisso.com" },
  { name: "Paulo Francisco Nascimento da Silva", role: "teacher", subject: "Assessor", email: "paulosilva@compromisso.com" },
  { name: "Régis (Reginaldo Lucindo)", role: "teacher", subject: "Prof. História/Geografia", email: "reginaldolucindo@compromisso.com", fallback: "regis@compromissose.com" },
  { name: "Claudemir Amaral", role: "teacher", subject: "Professor", email: "claudemiramaral@compromisso.com" },
  { name: "Teylor Paulo Nascimento da Silva", role: "teacher", subject: "Assistente", email: "teylorsilva@compromisso.com" },
  { name: "Pedro Henrique Alves Sampaio", role: "teacher", subject: "Prof. Física", email: "pedrosampaio@compromisso.com" },
  { name: "Jessica Aparecida Miguel da Silva", role: "teacher", subject: "Psicóloga", email: "jessicasilva@compromisso.com", fallback: "jessica@compromissose.com" },
  { name: "Fernando Martins", role: "teacher", subject: "Professor de Redação - Língua Portuguesa", email: "fernandomartins@compromisso.com" },
  { name: "BRUNO HENRIQUE LIMA", role: "admin", subject: "Administrador", email: "brunolima@compromisso.com", fallback: "bruno@compromissose.com" },
  { name: "Lucas Sá Teles Gonsalves", role: "teacher", subject: "Prof. Matemática", email: "lucasgonsalves@compromisso.com", fallback: "lucas@compromissose.com" },
  { name: "Luiz Fabiano da Silva", role: "teacher", subject: "Prof. Biologia", email: "luizsilva@compromisso.com", fallback: "luiz@compromissose.com" },
  { name: "Helio Fernando de Carvalho", role: "teacher", subject: "Prof. Matemática", email: "heliocarvalho@compromisso.com", fallback: "helio@compromissose.com" },
  { name: "ABRAHÃO COSTA DE FREITAS", role: "teacher", subject: "Prof. Literatura", email: "abrahaofreitas@compromisso.com" },
  { name: "Selma Samira Souza Oliveira", role: "teacher", subject: "Secretaria", email: "selmaoliveira@compromisso.com" },
  { name: "Roger (Rogério Loureiro)", role: "teacher", subject: "Prof. Matemática", email: "rogerioloureiro@compromisso.com", fallback: "roger@compromissose.com" },
  { name: "Matheus Goes da Silva", role: "teacher", subject: "Equipe Técnica", email: "matheussilva@compromisso.com", fallback: "matheus@compromissose.com" },
  { name: "Matheus Santana dos Santos", role: "teacher", subject: "VideoMaker", email: "matheussantos@compromisso.com", fallback: "matheussantos@compromissose.com" },
  { name: "Jorgenio Miranda Costa", role: "teacher", subject: "Professor Química", email: "jorgeniocosta@compromisso.com" },
  { name: "Eduardo Santos Bezerra", role: "admin", subject: "Equipe Técnica", email: "eduardobezerra@compromisso.com", fallback: "eduardo@compromissose.com" },
  { name: "Augusto Salgado", role: "teacher", subject: "Professor de História e Sociologia", email: "augustosalgado@compromisso.com", fallback: "augusto@compromissose.com" }
]

async function generateDefinitiveList() {
  console.log('📝 GERANDO LISTA DEFINITIVA E CRIANDO CONTAS FALTANTES...')
  
  const results = []
  const tempPassword = 'compromisso2026'

  for (const c of collaborators) {
    let finalEmail = c.email.toLowerCase().trim()
    let success = false

    try {
      // Tentar criar com e-mail original primeiro (se já não estiver criado)
      const { data: auth, error } = await supabase.auth.admin.createUser({
        email: finalEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { display_name: c.name, role: c.role, subject: c.subject, must_change_password: true }
      })

      if (error && error.message.includes('Database error') && c.fallback) {
        console.log(`- Falha no original para ${c.name}. Usando fallback: ${c.fallback}`)
        finalEmail = c.fallback
        const { data: authFallback, error: errorFallback } = await supabase.auth.admin.createUser({
          email: finalEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { display_name: c.name, role: c.role, subject: c.subject, must_change_password: true }
        })
        if (!errorFallback) {
          success = true
          await supabase.from('profiles').upsert({ id: authFallback.user.id, email: finalEmail, name: c.name, role: c.role, profile_type: c.role, course: c.subject, status: 'active' })
        }
      } else if (!error) {
        success = true
        await supabase.from('profiles').upsert({ id: auth.user.id, email: finalEmail, name: c.name, role: c.role, profile_type: c.role, course: c.subject, status: 'active' })
      } else if (error.message.includes('already registered')) {
        success = true // Já existe e está ok
      }

      results.push({ name: c.name, subject: c.subject, email: finalEmail })
    } catch (e) {
      console.error(`Erro em ${c.name}:`, e.message)
    }
  }

  console.log('\n| Nome | E-mail de Acesso | Matéria/Função |')
  console.log('| :--- | :--- | :--- |')
  results.forEach(r => console.log(`| ${r.name} | ${r.email} | ${r.subject} |`))
}

generateDefinitiveList()
